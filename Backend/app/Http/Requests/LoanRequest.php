<?php

namespace App\Http\Requests;

use App\Models\Loan;
use Illuminate\Foundation\Http\FormRequest;

class LoanRequest extends FormRequest
{
    /**
     * Customers always get the standard rate, whatever they send.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->user()->isStaff()) {
            $this->merge(['interest_rate' => Loan::STANDARD_RATE]);
        }
    }

    public function rules(): array
    {
        return [
            'customer_id' => [$this->user()->isStaff() ? 'required' : 'prohibited', 'integer', 'exists:customers,id'],
            'loan_amount' => ['required', 'numeric', 'min:1000', 'max:10000000'],
            'loan_term' => ['required', 'integer', 'min:1', 'max:360'],
            'interest_rate' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
