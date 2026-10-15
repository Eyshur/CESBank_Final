<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['customer_id', 'account_number', 'account_type', 'balance', 'status'])]
class Account extends Model
{
    public const TYPES = ['Savings', 'Current'];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'Active');
    }

    /**
     * Limit to accounts owned by the given user (used for Customer logins).
     */
    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->whereHas('customer', fn (Builder $q) => $q->where('user_id', $user->id));
    }

    /**
     * A random, unused 10-digit account number, e.g. 4520193847.
     */
    public static function generateNumber(): string
    {
        do {
            $candidate = (string) random_int(1000000000, 9999999999);
        } while (static::where('account_number', $candidate)->exists());

        return $candidate;
    }
}
