<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\ActivityLog;
use App\Models\Loan;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * One endpoint, three dashboards: the payload depends on who is asking.
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(match ($user->role) {
            User::ROLE_ADMIN => $this->admin(),
            User::ROLE_EMPLOYEE => $this->teller(),
            default => $this->customer($user),
        });
    }

    private function admin(): array
    {
        return [
            'stats' => [
                'customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'employees' => User::where('role', User::ROLE_EMPLOYEE)->count(),
                'active_accounts' => Account::active()->count(),
                'total_balance' => (float) Account::active()->sum('balance'),
                'pending_loans' => Loan::where('status', 'Pending')->count(),
            ],
            'daily_volume' => $this->dailyVolume(14),
            'recent_activity' => ActivityLog::with('user:id,username,role')
                ->latest('log_time')
                ->limit(10)
                ->get(),
        ];
    }

    private function teller(): array
    {
        $today = Transaction::whereDate('transaction_date', today());

        return [
            'stats' => [
                'deposits_today' => (float) (clone $today)->where('transaction_type', 'Deposit')->sum('amount'),
                'withdrawals_today' => (float) (clone $today)->where('transaction_type', 'Withdraw')->sum('amount'),
                'transactions_today' => (clone $today)->count(),
                'pending_loans' => Loan::where('status', 'Pending')->count(),
            ],
            'daily_volume' => $this->dailyVolume(7),
            'recent_transactions' => Transaction::with('account:id,account_number')
                ->latest('transaction_date')
                ->limit(10)
                ->get(),
        ];
    }

    private function customer(User $user): array
    {
        $customer = $user->customer;
        if (! $customer) {
            return ['customer' => null];
        }

        $accounts = $customer->accounts()->latest()->get();

        return [
            'customer' => $customer,
            'stats' => [
                'total_balance' => (float) $accounts->where('status', 'Active')->sum('balance'),
                'active_accounts' => $accounts->where('status', 'Active')->count(),
                'pending_loans' => $customer->loans()->where('status', 'Pending')->count(),
            ],
            'accounts' => $accounts,
            'recent_transactions' => Transaction::visibleTo($user)
                ->with('account:id,account_number')
                ->latest('transaction_date')
                ->limit(10)
                ->get(),
        ];
    }

    /**
     * Deposit / withdrawal totals per day for the chart.
     */
    private function dailyVolume(int $days): array
    {
        $rows = Transaction::where('transaction_date', '>=', today()->subDays($days - 1))
            ->selectRaw('DATE(transaction_date) as day, transaction_type, SUM(amount) as total')
            ->groupBy('day', 'transaction_type')
            ->get();

        return collect(range($days - 1, 0))->map(function ($offset) use ($rows) {
            $day = today()->subDays($offset)->toDateString();
            $forDay = $rows->where('day', $day);

            return [
                'day' => $day,
                'Deposit' => (float) $forDay->firstWhere('transaction_type', 'Deposit')?->total,
                'Withdraw' => (float) $forDay->firstWhere('transaction_type', 'Withdraw')?->total,
                'Transfer' => (float) $forDay->firstWhere('transaction_type', 'Transfer')?->total,
            ];
        })->values()->all();
    }
}
