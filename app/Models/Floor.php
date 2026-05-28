<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    use HasFactory;

    protected $fillable = [
        'block_id',
        'floor_number',
        'qr_code_hash',
    ];

    /**
     * Parent block structure.
     */
    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class);
    }

    /**
     * Units residing on this floor level.
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /**
     * Jobs scheduled to clean or collect on this floor.
     */
    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class);
    }
}
