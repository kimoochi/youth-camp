import React from 'react';
import type { RegistrationFormState, DelegateCategory, TShirtSize, Gender } from '../types';
import BirthdayPicker from './BirthdayPicker';

interface DelegateFormProps {
  form: RegistrationFormState;
  idx: number;
  onUpdateBulkForm: (index: number, field: keyof RegistrationFormState, value: string | number | Gender | DelegateCategory | TShirtSize) => void;
  calculateAge: (birthday: string) => string;
}

function DelegateForm({ form, idx, onUpdateBulkForm, calculateAge }: DelegateFormProps) {
  return (
    <div className="delegate-form-card">
      <div className="form-card-title">Delegate #{idx + 1}</div>
      <div className="form-grid-compact">
        <div className="field-group half">
          <label>Last Name</label>
          <input required value={form.lastName} onChange={e => onUpdateBulkForm(idx, 'lastName', e.target.value)} placeholder="e.g. Dela Cruz" />
        </div>
        <div className="field-group half">
          <label>First Name</label>
          <input required value={form.firstName} onChange={e => onUpdateBulkForm(idx, 'firstName', e.target.value)} placeholder="e.g. Juan" />
        </div>

        <div className="field-group third">
          <label>Birthday</label>
          <BirthdayPicker 
            value={form.birthday} 
            onChange={(val) => {
              onUpdateBulkForm(idx, 'birthday', val);
              const age = calculateAge(val);
              if (age) {
                onUpdateBulkForm(idx, 'age', age);
              }
            }}
          />
        </div>

        <div className="field-group third">
          <label>Age</label>
          <input required type="number" value={form.age} onChange={() => {}} placeholder="0" readOnly />
        </div>

        <div className="field-group third">
          <label>Gender</label>
          <select value={form.gender} onChange={e => onUpdateBulkForm(idx, 'gender', e.target.value as Gender)}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="field-group half">
          <label>Category</label>
          <select value={form.category} onChange={e => onUpdateBulkForm(idx, 'category', e.target.value as DelegateCategory)}>
            <option value="High School (JHS)">High School (JHS)</option>
            <option value="High School (SHS)">High School (SHS)</option>
            <option value="College">College</option>
            <option value="Young Professional">Young Professional</option>
          </select>
        </div>

        <div className="field-group half">
          <label>T-Shirt Size</label>
          <select value={form.tshirtSize} onChange={e => onUpdateBulkForm(idx, 'tshirtSize', e.target.value as TShirtSize)}>
            <option value="XS">Extra Small (XS)</option>
            <option value="S">Small (S)</option>
            <option value="M">Medium (M)</option>
            <option value="L">Large (L)</option>
            <option value="XL">Extra Large (XL)</option>
            <option value="XXL">2XL</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DelegateForm);
