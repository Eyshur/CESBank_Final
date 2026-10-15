<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Report data. The React app lays it out as a printable page (Print / Save as PDF),
 * replacing the FPDF reports from the native PHP version.
 */
class ReportController extends Controller
{
    public function transactions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'type' => ['nullable', Rule::in(Transaction::TYPES)],
        ]);

        $range = [$data['from'].' 00:00:00', $data['to'].' 23:59:59'];

        $rows = Transaction::with('account.customer:id,first_name,last_name')
            ->whereBetween('transaction_date', $range)
            ->when($data['type'] ?? null, fn ($q, $type) => $q->where('transaction_type', $type))
            ->orderBy('transaction_date')
            ->get();

        $totals = collect(Transaction::TYPES)->mapWithKeys(fn ($type) => [$type => ['count' => 0, 'amount' => 0.0]])->all();
        Transaction::whereBetween('transaction_date', $range)
            ->selectRaw('transaction_type, COUNT(*) as total_count, SUM(amount) as total_amount')
            ->groupBy('transaction_type')
            ->get()
            ->each(function ($row) use (&$totals) {
                $totals[$row->transaction_type] = ['count' => (int) $row->total_count, 'amount' => (float) $row->total_amount];
            });

        $request->user()->logActivity("Generated transactions report ({$data['from']} to {$data['to']})");

        return response()->json(['filters' => $data, 'rows' => $rows, 'totals' => $totals, 'generated_at' => now()]);
    }

    public function accounts(Request $request): JsonResponse
    {
        $data = $request->validate(['type' => ['nullable', Rule::in(Account::TYPES)]]);

        $rows = Account::with('customer:id,first_name,last_name')
            ->when($data['type'] ?? null, fn ($q, $type) => $q->where('account_type', $type))
            ->orderBy('account_type')
            ->orderBy('account_number')
            ->get();

        $totals = Account::selectRaw('account_type, status, COUNT(*) as total_count, SUM(balance) as total_balance')
            ->groupBy('account_type', 'status')
            ->orderBy('account_type')
            ->get();

        $request->user()->logActivity('Generated accounts report');

        return response()->json(['filters' => $data, 'rows' => $rows, 'totals' => $totals, 'generated_at' => now()]);
    }
}
