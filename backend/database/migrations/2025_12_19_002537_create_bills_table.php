<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sitting_id')->constrained()->onDelete('cascade');
            $table->string('bill_title');
            $table->string('bill_reference')->nullable();
            $table->string('legislative_stage')->nullable(); // e.g., "First Reading", "Second Reading"
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index('sitting_id');
            $table->index('bill_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
