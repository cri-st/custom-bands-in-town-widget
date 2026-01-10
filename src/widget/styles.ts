export const styles = `
:host {
  display: block;
  font-family: 'Söhne', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #0a0a0a;
  max-width: 100%;
  margin: 0 auto;
}

.bit-events-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.bit-event-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 24px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  opacity: 0;
  transform: translateY(10px);
  animation: bitFadeIn 0.5s ease forwards;
}

.bit-event-row:last-child {
  border-bottom: none;
}

.bit-venue {
  font-weight: 600;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.bit-date {
  font-size: 14px;
  text-transform: uppercase;
  text-align: center;
  min-width: 120px;
}

.bit-location {
  font-size: 14px;
  text-transform: uppercase;
  color: #666;
  text-align: right;
}

.bit-buy-btn {
  display: inline-block;
  padding: 8px 24px;
  border: 1px solid #0a0a0a;
  color: #0a0a0a;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  transition: all 0.2s ease;
  text-align: center;
  min-width: 80px;
}

.bit-buy-btn:hover {
  background: #0a0a0a;
  color: #ffffff;
}

@keyframes bitFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .bit-event-row {
    grid-template-columns: 1fr auto;
    gap: 12px;
  }
  
  .bit-location {
    grid-column: 1;
    text-align: left;
    font-size: 12px;
  }
  
  .bit-date {
    text-align: right;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .bit-event-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 20px 0;
  }
  
  .bit-date, .bit-location {
    text-align: left;
  }
  
  .bit-buy-btn {
    width: 100%;
    margin-top: 8px;
  }
}

/* Loading State */
.bit-loading {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #999;
}

.bit-error {
  padding: 20px;
  color: #ff4444;
  text-align: center;
  font-size: 14px;
}
`;
