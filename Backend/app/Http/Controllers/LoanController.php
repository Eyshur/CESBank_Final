<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoanRequest;
use App\Models\Customer;
use App\Models\Loan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LoanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $loans = Loan::visibleTo($request->user())
            ->with('customer:id,first_name,last_name')
            ->when(
                in_array($request->input('status'), Loan::STATUSES, true),
                fn ($q) => $q->where('status', $request->input('status'))
            )
            ->latest('application_date')
            ->latest('id')
            ->paginate($request->integer('per_page', 10));

        return response()->json($loans);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $loan = Loan::visibleTo($request->user())
            ->with(['customer', 'reviewer:id,username'])
            ->findOrFail($id);

        return response()->json($loan);
    }

    public function store(LoanRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $customer = $user->isStaff() ? Customer::findOrFail($data['customer_id']) : $user->customer;
        if (! $customer) {
            return response()->json(['message' => "Your login isn't linked to a customer profile yet. Please contact support."], 422);
        }

        $loan = $customer->loans()->create([
            'loan_amount' => $data['loan_amount'],
            'interest_rate' => $data['interest_rate'],
            'loan_term' => $data['loan_term'],
            'status' => 'Pending',
            'application_date' => today(),
        ]);

        $user->logActivity("Submitted loan application #{$loan->id}");

        return response()->json(['message' => 'Loan application submitted successfully.', 'loan' => $loan], 201);
    }

    /**
     * Approve or decline. Only a Pending loan can be decided, so a second
     * staff member can't overturn a decision that has already been made.
     */
    public function updateStatus(Request $request, Loan $loan): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['Accepted', 'Declined'])]]);

        if ($loan->status !== 'Pending') {
            return response()->json(['message' => "This application was already {$loan->status}."], 409);
        }

        $loan->update(['status' => $data['status'], 'reviewed_by' => $request->user()->id]);
        $request->user()->logActivity("{$data['status']} loan application #{$loan->id}");

        return response()->json(['message' => "Loan application {$data['status']}."]);
    }

    /**
     * Active customers for the staff "apply on behalf of" dropdown.
     */
    public function customers(): JsonResponse
    {
        $customers = Customer::whereHas('user', fn ($q) => $q->where('status', 'Active'))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name']);

        return response()->json($customers);
    }
}
