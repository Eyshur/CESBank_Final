<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The signed-in user's own profile and password.
 */
class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'first_name' => [$user->customer ? 'required' : 'nullable', 'string', 'max:100'],
            'last_name' => [$user->customer ? 'required' : 'nullable', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['Male', 'Female', 'Other'])],
            'contact_no' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update(['email' => $data['email'] ?? null]);
        $user->customer?->update(collect($data)->only(['first_name', 'last_name', 'birthdate', 'gender', 'contact_no', 'address', 'email'])->all());

        $user->logActivity('Updated own profile');

        return response()->json(['message' => 'Profile updated.', 'user' => $user->fresh('customer')]);
    }

    /**
     * Google-only users have no password yet, so they may set one without the current password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => [$user->password ? 'required' : 'nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($user->password && ! Hash::check($request->input('current_password'), $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Your current password is incorrect.']);
        }

        $user->update(['password' => $request->input('password')]);
        $user->logActivity('Changed password');

        return response()->json(['message' => 'Password updated.']);
    }
}
