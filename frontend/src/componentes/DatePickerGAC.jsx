import React, { useState, useEffect, useRef } from 'react';
import ReactDatePicker from 'react-datepicker';
import { parseISO, isValid } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const DatePickerGAC = ({ value, onChange, placeholder = 'dd/mm/aaaa', maxDate }) => {
  const [date, setDate] = useState(null);
  const dpRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setDate(null);
      return;
    }

    let d = null;
    try {
      d = typeof value === 'string' && value.includes('T') ? parseISO(value) : new Date(value);
    } catch (err) {
      d = new Date(value);
    }

    if (isValid(d)) setDate(d);
    else setDate(null);
  }, [value]);

  const handleChange = (d) => {
    setDate(d);
    if (!d) {
      onChange('');
      return;
    }
    onChange(d.toISOString());
  };

  return (
    <div className="gac-date-wrapper">
      <ReactDatePicker
        ref={dpRef}
        selected={date}
        onChange={handleChange}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        className="gac-date-input"
        maxDate={maxDate ? new Date(maxDate) : undefined}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
      />
      <button
        type="button"
        className="gac-date-icon"
        aria-hidden
        onClick={() => dpRef.current && dpRef.current.setOpen(true)}
      >
        📆
      </button>
    </div>
  );
};

export default DatePickerGAC;
