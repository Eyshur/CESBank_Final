<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
| CESBank API. Every response is JSON; protected routes need a
| "Authorization: Bearer <token>" header from /login, /register or /auth/google.
*/

Route::get('/health', fn () => response()->json(['status' => 'ok', 'system' => 'CESBank API']));

// Public: Google Client ID for the sign-in button (it is not a secret).
Route::get('/config', fn () => response()->json(['google_client_id' => config('services.google.client_id')]));

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/auth/google', [GoogleAuthController::class, 'login']);
});

Route::middleware(['auth:sanctum', 'role'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/me/profile', [ProfileController::class, 'update']);
    Route::put('/me/password', [ProfileController::class, 'updatePassword']);

    Route::get('/dashboard', DashboardController::class);

    // Everyone (customers see only their own records).
    Route::get('/accounts', [AccountController::class, 'index']);
    Route::get('/accounts/lookup/{accountNumber}', [AccountController::class, 'lookup'])->middleware('throttle:30,1');
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/{id}', [TransactionController::class, 'show']);
    Route::get('/loans', [LoanController::class, 'index']);
    Route::post('/loans', [LoanController::class, 'store']);
    Route::get('/loans/{id}', [LoanController::class, 'show']);

    // Staff: Administrators and Employees (tellers).
    Route::middleware('role:Administrator,Employee')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::post('/customers/{customer}/accounts', [AccountController::class, 'store']);
        Route::patch('/accounts/{account}/status', [AccountController::class, 'updateStatus']);
        Route::get('/loan-customers', [LoanController::class, 'customers']);
        Route::patch('/loans/{loan}/status', [LoanController::class, 'updateStatus']);
        Route::get('/reports/transactions', [ReportController::class, 'transactions']);
        Route::get('/reports/accounts', [ReportController::class, 'accounts']);
    });

    // Administrators only.
    Route::middleware('role:Administrator')->group(function () {
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });
});
