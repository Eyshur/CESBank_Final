<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create / update a login, plus the customer profile when the role is Customer.
 * Employees may only ever manage Customers; that is enforced in prepareForValidation.
 */
class UserRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->user()->role === User::ROLE_EMPLOYEE) {
            $this->merge(['role' => User::ROLE_CUSTOMER, 'status' => 'Active']);
        }
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;
        $isCustomer = $this->input('role') === User::ROLE_CUSTOMER;

        return [
            'username' => ['required', 'string', 'min:4', 'max:50', 'alpha_dash', Rule::unique('users')->ignore($userId)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($userId)],
            'password' => [$userId ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_EMPLOYEE, User::ROLE_CUSTOMER])],
            'status' => ['required', Rule::in(['Active', 'Inactive'])],

            'first_name' => [Rule::requiredIf($isCustomer), 'nullable', 'string', 'max:100'],
            'last_name' => [Rule::requiredIf($isCustomer), 'nullable', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['Male', 'Female', 'Other'])],
            'contact_no' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function userData(): array
    {
        return array_filter(
            $this->safe()->only(['username', 'email', 'password', 'role', 'status']),
            fn ($value, $key) => $key !== 'password' || filled($value),
            ARRAY_FILTER_USE_BOTH,
        );
    }

    public function customerData(): array
    {
        return $this->safe()->only(['first_name', 'last_name', 'birthdate', 'gender', 'contact_no', 'address'])
            + ['email' => $this->input('email')];
    }
}
