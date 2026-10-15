<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * "Sign in with Google".
 *
 * The React app uses Google Identity Services to get an ID token (a signed JWT)
 * and posts it here. We ask Google's tokeninfo endpoint to verify it, check it
 * was issued for OUR client ID, then find or create the matching user.
 */
class GoogleAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate(['credential' => ['required', 'string']]);

        $clientId = config('services.google.client_id');
        if (! $clientId) {
            return response()->json(['message' => 'Google Sign-In is not configured on the server.'], 503);
        }

        $profile = $this->verifyIdToken($request->string('credential'), $clientId);

        $user = $this->findOrCreateUser($profile);

        if (! $user->isActive()) {
            throw ValidationException::withMessages(['credential' => 'This account is inactive. Please contact the bank.']);
        }

        $user->logActivity('Logged in with Google');

        return AuthController::tokenResponse($user);
    }

    /**
     * @return array{sub: string, email: string, given_name?: string, family_name?: string, name?: string, picture?: string}
     */
    private function verifyIdToken(string $idToken, string $clientId): array
    {
        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', ['id_token' => $idToken]);

        $claims = $response->json();

        $valid = $response->ok()
            && ($claims['aud'] ?? null) === $clientId
            && in_array($claims['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true)
            && ($claims['email_verified'] ?? null) === 'true'
            && (int) ($claims['exp'] ?? 0) > time();

        if (! $valid) {
            throw ValidationException::withMessages(['credential' => 'Google sign-in failed. Please try again.']);
        }

        return $claims;
    }

    /**
     * Match by Google ID first, then by email (linking an existing account),
     * otherwise register a brand-new Customer.
     */
    private function findOrCreateUser(array $profile): User
    {
        $user = User::where('google_id', $profile['sub'])->first()
            ?? User::where('email', $profile['email'])->first();

        if ($user) {
            $user->update([
                'google_id' => $profile['sub'],
                'avatar' => $profile['picture'] ?? $user->avatar,
            ]);

            return $user;
        }

        return DB::transaction(function () use ($profile) {
            $user = User::create([
                'username' => $this->uniqueUsername($profile['email']),
                'email' => $profile['email'],
                'google_id' => $profile['sub'],
                'avatar' => $profile['picture'] ?? null,
                'role' => User::ROLE_CUSTOMER,
            ]);

            $user->customer()->create([
                'first_name' => $profile['given_name'] ?? Str::before($profile['email'], '@'),
                'last_name' => $profile['family_name'] ?? '',
                'email' => $profile['email'],
            ]);

            $user->logActivity('Registered with Google');

            return $user;
        });
    }

    private function uniqueUsername(string $email): string
    {
        $base = Str::of($email)->before('@')->lower()->replaceMatches('/[^a-z0-9_.]/', '')->limit(40, '')->toString() ?: 'customer';
        $username = $base;

        for ($i = 1; User::where('username', $username)->exists(); $i++) {
            $username = $base.$i;
        }

        return $username;
    }
}
