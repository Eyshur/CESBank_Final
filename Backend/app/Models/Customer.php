<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'first_name', 'last_name', 'birthdate', 'gender', 'email', 'contact_no', 'address'])]
class Customer extends Model
{
    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * A customer with any account or loan on file cannot be deleted without
     * losing financial history, so they should be deactivated instead.
     */
    public function canBeDeleted(): bool
    {
        return ! $this->accounts()->exists() && ! $this->loans()->exists();
    }
}
