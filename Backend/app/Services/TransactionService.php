<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moves money. Every balance change and its ledger rows are written inside one
 * database transaction with the affected accounts row-locked, so two tellers
 * working on the same account can never overdraw it.
 */
class TransactionService
{
    public function process(User $actor, int $accountId, string $type, float $amount, ?int $receiverId, ?string $remarks): Transaction
    {
        if ($type !== 'Transfer') {
            $receiverId = null;
        }

        if ($type === 'Transfer' && $receiverId === $accountId) {
            throw ValidationException::withMessages(['receiver_id' => 'Choose a different destination account.']);
        }

        return DB::transaction(function () use ($actor, $accountId, $type, $amount, $receiverId, $remarks) {
            $source = $this->lockActiveAccount($accountId, 'account_id', 'The selected source account is unavailable.');
            $this->assertCustomerOwns($actor, $source, 'account_id', 'You can only use your own accounts.');

            $destination = null;
            if ($type === 'Transfer') {
                $destination = $this->lockActiveAccount($receiverId, 'receiver_id', 'The destination account is unavailable.');
            }

            if ($type !== 'Deposit' && (float) $source->balance < $amount) {
                throw ValidationException::withMessages(['amount' => 'Insufficient funds for this transaction.']);
            }

            match ($type) {
                'Deposit' => $source->increment('balance', $amount),
                'Withdraw' => $source->decrement('balance', $amount),
                'Transfer' => [$source->decrement('balance', $amount), $destination->increment('balance', $amount)],
            };

            $transaction = Transaction::create([
                'account_id' => $source->id,
                'transaction_type' => $type,
                'amount' => $amount,
                'receiver_id' => $destination?->id,
                'processed_by' => $actor->id,
                'remarks' => $remarks,
                'transaction_date' => now(),
            ]);

            // The receiving account gets its own ledger row so it shows up in its history.
            if ($destination) {
                Transaction::create([
                    'account_id' => $destination->id,
                    'transaction_type' => 'Transfer',
                    'amount' => $amount,
                    'receiver_id' => $source->id,
                    'processed_by' => $actor->id,
                    'remarks' => 'Transfer received'.($remarks ? ": {$remarks}" : ''),
                    'transaction_date' => now(),
                ]);
            }

            $actor->logActivity("Processed {$type} of PHP ".number_format($amount, 2)." on account {$source->account_number}");

            return $transaction;
        });
    }

    private function lockActiveAccount(?int $id, string $field, string $message): Account
    {
        $account = Account::active()->with('customer')->lockForUpdate()->find($id);

        if (! $account) {
            throw ValidationException::withMessages([$field => $message]);
        }

        return $account;
    }

    private function assertCustomerOwns(User $actor, Account $account, string $field, string $message): void
    {
        if ($actor->role === User::ROLE_CUSTOMER && $account->customer->user_id !== $actor->id) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }
}
