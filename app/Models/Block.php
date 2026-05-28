<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Block extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'notes',
    ];

    /**
     * Floors associated with this block structure.
     */
    public function floors(): HasMany
    {
        return $this->hasMany(Floor::class);
    }

    /**
     * Jobs scheduled for this block.
     */
    public function jobs(): HasMany
    {
        return $this->hasMany(Job::class);
    }
}
