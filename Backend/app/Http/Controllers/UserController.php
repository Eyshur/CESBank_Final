<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Users & customers. Administrators manage everyone; Employees only see
 * and register Customers.
 */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        $users = User::with('customer')
            ->when($actor->role === User::ROLE_EMPLOYEE, fn ($q) => $q->where('role', User::ROLE_CUSTOMER))
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->input('role')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->where(fn ($q) => $q->where('username', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhereHas('customer', fn ($c) => $c->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term)));
            })
            ->latest('id')
            ->paginate($request->integer('per_page', 10));

        return response()->json($users);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeTarget($request->user(), $user);

        return response()->json($user->load(['customer.accounts', 'customer.loans']));
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create($request->userData());

            if ($user->role === User::ROLE_CUSTOMER) {
                $user->customer()->create($request->customerData());
            }

            return $user;
        });

        $request->user()->logActivity("Created {$user->role} account {$user->username}");

        return response()->json(['message' => 'User created successfully.', 'user' => $user->load('customer')], 201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $this->authorizeTarget($request->user(), $user);

        DB::transaction(function () use ($request, $user) {
            $user->update($request->userData());

            if ($user->role === User::ROLE_CUSTOMER) {
                $user->customer()->updateOrCreate(['user_id' => $user->id], $request->customerData());
            }
        });

        $request->user()->logActivity("Updated account {$user->username}");

        return response()->json(['message' => 'User updated successfully.', 'user' => $user->fresh('customer')]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['Active', 'Inactive'])]]);

        if ($request->user()->is($user) && $data['status'] === 'Inactive') {
            return response()->json(['message' => "You can't deactivate your own account while logged in."], 422);
        }

        $user->update($data);
        if ($data['status'] === 'Inactive') {
            $user->tokens()->delete();
        }

        $request->user()->logActivity("Set {$user->username}'s status to {$data['status']}");

        return response()->json(['message' => "Account marked as {$data['status']}."]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json(['message' => "You can't delete your own account."], 422);
        }

        if ($user->customer && ! $user->customer->canBeDeleted()) {
            return response()->json([
                'message' => "This customer has existing accounts or loan records and can't be deleted. Deactivate the account instead.",
            ], 422);
        }

        $username = $user->username;
        $user->delete();

        $request->user()->logActivity("Deleted account {$username}");

        return response()->json(['message' => 'User deleted successfully.']);
    }

    private function authorizeTarget(User $actor, User $target): void
    {
        abort_if(
            $actor->role === User::ROLE_EMPLOYEE && $target->role !== User::ROLE_CUSTOMER,
            403,
            'Employees can only manage customer accounts.'
        );
    }
}
