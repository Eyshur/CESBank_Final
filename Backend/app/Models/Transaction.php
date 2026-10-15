<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['account_id', 'transaction_type', 'amount', 'receiver_id', 'processed_by', 'remarks', 'transaction_date'])]
class Transaction extends Model
{
    public const TYPES = ['Deposit', 'Withdraw', 'Transfer'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_date' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'receiver_id');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Customers only ever see transactions on their own accounts.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->role === User::ROLE_CUSTOMER) {
            $query->whereHas('account', fn (Builder $q) => $q->ownedBy($user));
        }

        return $query;
    }
}
