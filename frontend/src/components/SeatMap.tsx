import React from 'react';
import type { Seat } from '../lib/api';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: number[];
  heldSeatIds: number[];
  onToggleSeat: (seatId: number) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  heldSeatIds,
  onToggleSeat,
}) => {
  // Group seats by row letter (e.g., A, B, C, D, E)
  const rows: { [key: string]: Seat[] } = {};
  
  seats.forEach(seat => {
    const rowLetter = seat.seatLabel.charAt(0);
    if (!rows[rowLetter]) {
      rows[rowLetter] = [];
    }
    rows[rowLetter].push(seat);
  });

  // Sort rows alphabetically, and seats within each row numerically
  const sortedRowKeys = Object.keys(rows).sort();
  sortedRowKeys.forEach(row => {
    rows[row].sort((a, b) => {
      const numA = parseInt(a.seatLabel.substring(1));
      const numB = parseInt(b.seatLabel.substring(1));
      return numA - numB;
    });
  });

  const getSeatClass = (seat: Seat) => {
    if (seat.status === 'BOOKED') return 'seat-cell booked';
    if (heldSeatIds.includes(seat.id)) return 'seat-cell held-me';
    if (seat.status === 'HELD') return 'seat-cell held-others';
    if (selectedSeatIds.includes(seat.id)) return 'seat-cell selected';
    return 'seat-cell available';
  };

  const getSeatLabelDescription = (seat: Seat) => {
    if (seat.status === 'BOOKED') return `Seat ${seat.seatLabel} is booked`;
    if (heldSeatIds.includes(seat.id)) return `Seat ${seat.seatLabel} is held by you`;
    if (seat.status === 'HELD') return `Seat ${seat.seatLabel} is held by another user`;
    if (selectedSeatIds.includes(seat.id)) return `Seat ${seat.seatLabel} is selected`;
    return `Seat ${seat.seatLabel} is available`;
  };

  return (
    <div className="seat-map-hero">
      <div className="stage-indicator">STAGE / SCREEN</div>

      <div className="seats-container">
        {sortedRowKeys.map(rowKey => (
          <div key={rowKey} className="seat-row" role="group" aria-label={`Row ${rowKey}`}>
            <span className="row-label">{rowKey}</span>
            {rows[rowKey].map(seat => {
              const isInteractable = seat.status === 'AVAILABLE' || heldSeatIds.includes(seat.id) || selectedSeatIds.includes(seat.id);
              return (
                <button
                  key={seat.id}
                  className={getSeatClass(seat)}
                  onClick={() => isInteractable && onToggleSeat(seat.id)}
                  disabled={!isInteractable}
                  aria-label={getSeatLabelDescription(seat)}
                  title={getSeatLabelDescription(seat)}
                >
                  {seat.seatLabel.substring(1)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="legend-container">
        <div className="legend-item">
          <div className="legend-dot available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot selected"></div>
          <span>Selected</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot held" style={{ animation: 'pulse-hold 2s infinite ease-in-out' }}></div>
          <span>Held (You)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot held"></div>
          <span>Held (Others)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot booked"></div>
          <span>Sold</span>
        </div>
      </div>
    </div>
  );
};
