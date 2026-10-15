<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransactionRequest;
use App\Models\Account;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    public function __construct(private readonly TransactionService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $transactions = Transaction::visibleTo($request->user())
            ->with(['account.customer:id,first_name,last_name', 'receiver:id,account_number'])
            ->when($request->filled('type'), fn ($q) => $q->where('transaction_type', $request->input('type')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('transaction_date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('transaction_date', '<=', $request->input('to')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->whereHas('account', fn ($a) => $a->where('account_number', 'like', $term)
                    ->orWhereHas('customer', fn ($c) => $c->where('first_name', 'like', $term)->orWhere('last_name', 'like', $term)));
            })
            ->latest('transaction_date')
            ->latest('id')
            ->paginate($request->integer('per_page', 10));

        return response()->json($transactions);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $transaction = Transaction::visibleTo($request->user())
            ->with(['account.customer', 'receiver.customer:id,first_name,last_name', 'processor:id,username'])
            ->findOrFail($id);

        return response()->json($transaction);
    }

    public function store(TransactionRequest $request): JsonResponse
    {
        $data = $request->validated();

        $receiverId = null;
        if ($data['transaction_type'] === 'Transfer') {
            $receiverId = Account::where('account_number', $data['receiver_account_number'])->value('id');
            if (! $receiverId) {
                throw ValidationException::withMessages(['receiver_account_number' => 'No account with that number.']);
            }
        }

        $transaction = $this->service->process(
            $request->user(),
            (int) $data['account_id'],
            $data['transaction_type'],
            (float) $data['amount'],
            $receiverId,
            $data['remarks'] ?? null,
        );

        return response()->json([
            'message' => "{$transaction->transaction_type} completed successfully.",
            'transaction' => $transaction->load('account:id,account_number,balance'),
        ], 201);
    }
}
