<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. ADMINS / SCHEME MANAGERS
        User::create([
            'name' => 'Amantha Salgadu',
            'email' => 'amanthasal@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94770001122',
            'role' => 'admin',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Dilshan De Silva',
            'email' => 'admin@ecotrack.lk',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94771122334',
            'role' => 'admin',
            'status' => 'active',
        ]);

        // 2. WASTE WORKERS
        User::create([
            'name' => 'Sunil Kumara',
            'email' => 'sunil@ecotrack.lk',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94751112223',
            'role' => 'worker',
            'shift' => 'morning',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Nimal Perera',
            'email' => 'nimal@ecotrack.lk',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94709876543',
            'role' => 'worker',
            'shift' => 'evening',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Kasun Wijesekera',
            'email' => 'kasun.w@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94723322114',
            'role' => 'worker',
            'shift' => 'morning',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Rohan Silva',
            'email' => 'rohan@ecotrack.lk',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94715566778',
            'role' => 'worker',
            'shift' => 'night',
            'status' => 'active',
        ]);

        // 3. RESIDENTS
        User::create([
            'name' => 'Chaminda Salgadu',
            'email' => 'chaminda@ecotrack.lk',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94770001133',
            'role' => 'resident',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Dilani Senanayake',
            'email' => 'dilani@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94711122233',
            'role' => 'resident',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Priya Jayasinghe',
            'email' => 'priya@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94772223344',
            'role' => 'resident',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Ranil Herath',
            'email' => 'ranilh@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94763334455',
            'role' => 'resident',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Sasini Mendis',
            'email' => 'sasini@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'phone' => '+94724445566',
            'role' => 'resident',
            'status' => 'active',
        ]);
    }
}
