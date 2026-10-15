<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    /**
     * Active accounts the current user may move money out of
     * (their own for Customers, everyone's for staff).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $accounts = Account::active()
            ->with('customer:id,first_name,last_name')
            ->when($user->role === User::ROLE_CUSTOMER, fn ($q) => $q->ownedBy($user))
            ->orderBy('account_number')
            ->get();

        return response()->json($accounts);
    }

    /**
     * Look up who owns an account number before confirming a transfer.
     */
    public function lookup(string $accountNumber): JsonResponse
    {
        $account = Account::active()->with('customer:id,first_name,last_name')
            ->where('account_number', $accountNumber)
            ->first();

        if (! $account) {
            return response()->json(['message' => 'No active account with that number.'], 404);
        }

        // Only reveal a masked name to protect customer privacy.
        $last = $account->customer->last_name;

        return response()->json([
            'account_number' => $account->account_number,
            'account_type' => $account->account_type,
            'holder' => $account->customer->first_name.' '.mb_substr($last, 0, 1).'.',
        ]);
    }

    public function store(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'account_type' => ['required', Rule::in(Account::TYPES)],
            'opening_balance' => ['required', 'numeric', 'min:0', 'max:10000000'],
        ]);

        $account = $customer->accounts()->create([
            'account_number' => Account::generateNumber(),
            'account_type' => $data['account_type'],
            'balance' => $data['opening_balance'],
        ]);

        $request->user()->logActivity("Opened a {$account->account_type} account ({$account->account_number}) for {$customer->full_name}");

        return response()->json([
            'message' => "Account {$account->account_number} opened successfully.",
            'account' => $account,
        ], 201);
    }

    public function updateStatus(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['Active', 'Inactive'])]]);

        $account->update($data);
        $request->user()->logActivity("Set account {$account->account_number} to {$data['status']}");

        return response()->json(['message' => "Account {$account->account_number} is now {$data['status']}."]);
    }
}
