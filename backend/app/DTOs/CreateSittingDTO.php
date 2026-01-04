<?php

namespace App\DTOs;

class CreateSittingDTO
{
    public function __construct(
        public int $sessionId,
        public string $date,
        public ?string $timeOpened = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            sessionId: $data['session_id'],
            date: $data['date'],
            timeOpened: $data['time_opened'] ?? null,
        );
    }
}














