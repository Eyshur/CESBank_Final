<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['customer_id', 'loan_amount', 'interest_rate', 'loan_term', 'status', 'application_date', 'reviewed_by'])]
class Loan extends Model
{
    public const STATUSES = ['Pending', 'Accepted', 'Declined'];

    /** Standard bank rate (%) applied to customer-filed applications. */
    public const STANDARD_RATE = 5.00;

    protected $appends = ['monthly_payment', 'total_payable'];

    protected function casts(): array
    {
        return [
            'loan_amount' => 'decimal:2',
            'interest_rate' => 'decimal:2',
            'loan_term' => 'integer',
            'application_date' => 'date:Y-m-d',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->role === User::ROLE_CUSTOMER) {
            $query->whereHas('customer', fn (Builder $q) => $q->where('user_id', $user->id));
        }

        return $query;
    }

    /**
     * Amortized monthly payment, treating interest_rate as an annual rate.
     */
    public function getMonthlyPaymentAttribute(): float
    {
        $principal = (float) $this->loan_amount;
        $months = max(1, (int) $this->loan_term);
        $monthlyRate = ((float) $this->interest_rate / 100) / 12;

        if ($monthlyRate == 0.0) {
            return round($principal / $months, 2);
        }

        return round($principal * $monthlyRate / (1 - pow(1 + $monthlyRate, -$months)), 2);
    }

    public function getTotalPayableAttribute(): float
    {
        return round($this->monthly_payment * max(1, (int) $this->loan_term), 2);
    }
}
