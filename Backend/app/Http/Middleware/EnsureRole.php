<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard: `->middleware('role:Administrator,Employee')`.
 * Also turns away users whose login has been deactivated since their token was issued.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isActive()) {
            return response()->json(['message' => 'Your account is inactive. Please contact the bank.'], 403);
        }

        if ($roles && ! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'You do not have permission to do that.'], 403);
        }

        return $next($request);
    }
}
