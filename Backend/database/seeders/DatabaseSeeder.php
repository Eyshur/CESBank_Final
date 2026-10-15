<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Loan;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data. Every seeded account uses the password "password123".
 *   admin   / Administrator
 *   teller  / Employee
 *   jdelacruz, msantos / Customer
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'username' => 'admin',
            'email' => 'admin@cesbank.test',
            'password' => 'password123',
            'role' => User::ROLE_ADMIN,
        ]);

        $teller = User::create([
            'username' => 'teller',
            'email' => 'teller@cesbank.test',
            'password' => 'password123',
            'role' => User::ROLE_EMPLOYEE,
        ]);

        $customers = [
            ['jdelacruz', 'Juan', 'Dela Cruz', 'Male', '1995-04-12', '09171234567', 'Quezon City'],
            ['msantos', 'Maria', 'Santos', 'Female', '1998-09-23', '09181234567', 'Makati City'],
        ];

        foreach ($customers as [$username, $first, $last, $gender, $birthdate, $contact, $address]) {
            $user = User::create([
                'username' => $username,
                'email' => "{$username}@cesbank.test",
                'password' => 'password123',
                'role' => User::ROLE_CUSTOMER,
            ]);

            $customer = $user->customer()->create([
                'first_name' => $first,
                'last_name' => $last,
                'gender' => $gender,
                'birthdate' => $birthdate,
                'email' => $user->email,
                'contact_no' => $contact,
                'address' => $address,
            ]);

            $savings = $customer->accounts()->create([
                'account_number' => Account::generateNumber(),
                'account_type' => 'Savings',
                'balance' => 0,
            ]);

            // A few deposits/withdrawals spread over the last month.
            $balance = 0;
            foreach ([[25000, 'Deposit', 20], [5000, 'Withdraw', 12], [12000, 'Deposit', 5], [1500, 'Withdraw', 1]] as [$amount, $type, $daysAgo]) {
                $balance += $type === 'Deposit' ? $amount : -$amount;
                Transaction::create([
                    'account_id' => $savings->id,
                    'transaction_type' => $type,
                    'amount' => $amount,
                    'processed_by' => $teller->id,
                    'remarks' => $type === 'Deposit' ? 'Cash deposit' : 'Cash withdrawal',
                    'transaction_date' => now()->subDays($daysAgo),
                ]);
            }
            $savings->update(['balance' => $balance]);

            $customer->loans()->create([
                'loan_amount' => 50000,
                'interest_rate' => Loan::STANDARD_RATE,
                'loan_term' => 12,
                'status' => 'Pending',
                'application_date' => now()->subDays(2)->toDateString(),
            ]);
        }

        $admin->logActivity('Seeded demo data');
    }
}
