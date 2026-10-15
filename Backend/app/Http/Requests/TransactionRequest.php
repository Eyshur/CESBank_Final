<?php

namespace App\Http\Requests;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransactionRequest extends FormRequest
{
    public function rules(): array
    {
        // Cash deposits and withdrawals happen at the counter; customers can only transfer online.
        $types = $this->user()->role === User::ROLE_CUSTOMER ? ['Transfer'] : Transaction::TYPES;

        return [
            'account_id' => ['required', 'integer'],
            'transaction_type' => ['required', Rule::in($types)],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'receiver_account_number' => ['required_if:transaction_type,Transfer', 'nullable', 'digits:10'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'transaction_type.in' => 'Select a valid transaction type.',
            'receiver_account_number.required_if' => 'Enter the destination account number.',
        ];
    }
}
