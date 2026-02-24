import React from 'react';

const MONTHS = [
  { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
  { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
  { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
  { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
];

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const DAYS = range(1, 31).map(d => d.toString().padStart(2, '0'));
const currentYear = new Date().getFullYear();

const previousYears = range(currentYear - 60, currentYear - 5);
const additionalYears = range(2022, 2026);
const allYears = [...new Set([...previousYears, ...additionalYears])].sort((a, b) => b - a);
const YEARS = allYears.map(y => y.toString());

interface BirthdayPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const [y, m, d] = value.split('-');

  const handleUpdate = (part: 'y' | 'm' | 'd', val: string) => {
    const newDate = { y, m, d };
    if (part === 'y') newDate.y = val;
    if (part === 'm') newDate.m = val;
    if (part === 'd') newDate.d = val;
    onChange(`${newDate.y || ''}-${newDate.m || ''}-${newDate.d || ''}`);
  };

  return (
    <div className="birthday-select-group">
      <select value={m || ''} onChange={e => handleUpdate('m', e.target.value)}>
        <option value="" disabled>Month</option>
        {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
      </select>
      <select value={d || ''} onChange={e => handleUpdate('d', e.target.value)}>
        <option value="" disabled>Day</option>
        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={y || ''} onChange={e => handleUpdate('y', e.target.value)}>
        <option value="" disabled>Year</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

export default React.memo(BirthdayPicker);
