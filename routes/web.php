<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-admin-password', function () {
    $user = \App\Models\User::where('email', 'donovinishansalgadu@gmail.com')->first();
    if ($user) {
        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make('password123')
        ]);
        return "Admin password reset to 'password123' successfully!";
    }
    return "Admin user not found!";
});
