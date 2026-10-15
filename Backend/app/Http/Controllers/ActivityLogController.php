<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = ActivityLog::with('user:id,username,role')
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->input('search').'%';
                $q->where('action', 'like', $term)->orWhereHas('user', fn ($u) => $u->where('username', 'like', $term));
            })
            ->latest('log_time')
            ->latest('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json($logs);
    }
}
