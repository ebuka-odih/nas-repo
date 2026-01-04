<?php

namespace App\DTOs;

class CreateAgendaItemDTO
{
    public function __construct(
        public int $sittingId,
        public int $agendaNumber,
        public string $title,
        public string $proceduralText,
        public ?string $outcome = null,
        public int $order = 0,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            sittingId: $data['sitting_id'],
            agendaNumber: $data['agenda_number'],
            title: $data['title'],
            proceduralText: $data['procedural_text'],
            outcome: $data['outcome'] ?? null,
            order: $data['order'] ?? 0,
        );
    }
}














