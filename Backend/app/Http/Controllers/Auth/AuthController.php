<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Username (or email) + password login. Returns a Sanctum bearer token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $credentials['username'])
            ->orWhere('email', $credentials['username'])
            ->first();

        if (! $user || ! $user->password || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['username' => 'Invalid username or password.']);
        }

        if (! $user->isActive()) {
            throw ValidationException::withMessages(['username' => 'This account is inactive. Please contact the bank.']);
        }

        $user->logActivity('Logged in');

        return $this->tokenResponse($user);
    }

    /**
     * Customer self-registration (new in the Laravel version).
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => User::ROLE_CUSTOMER,
            ]);

            $user->customer()->create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'contact_no' => $data['contact_no'] ?? null,
            ]);

            $user->logActivity('Registered an account');

            return $user;
        });

        return $this->tokenResponse($user, 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('customer'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->logActivity('Logged out');
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Shared by password login, registration and Google login.
     */
    public static function tokenResponse(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $user->createToken('cesbank')->plainTextToken,
            'user' => $user->load('customer'),
        ], $status);
    }
}
