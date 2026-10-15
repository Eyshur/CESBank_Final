<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A login account. Staff (Administrator / Employee) are just users;
 * a Customer user also has a linked Customer profile.
 */
#[Fillable(['username', 'email', 'password', 'google_id', 'avatar', 'role', 'status'])]
#[Hidden(['password', 'remember_token', 'google_id'])]
class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public const ROLE_ADMIN = 'Administrator';
    public const ROLE_EMPLOYEE = 'Employee';
    public const ROLE_CUSTOMER = 'Customer';

    protected $appends = ['has_password', 'has_google'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function getHasPasswordAttribute(): bool
    {
        return filled($this->password);
    }

    public function getHasGoogleAttribute(): bool
    {
        return filled($this->google_id);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_EMPLOYEE], true);
    }

    public function isActive(): bool
    {
        return $this->status === 'Active';
    }

    /**
     * Record an action in the audit trail.
     */
    public function logActivity(string $action): void
    {
        $this->activityLogs()->create(['action' => $action]);
    }
}
