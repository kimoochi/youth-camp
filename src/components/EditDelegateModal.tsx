import { useState } from 'react';
import type { Delegate, RegistrationFormState } from '../types';

interface EditDelegateModalProps {
  delegate: Delegate | null;
  onClose: () => void;
  onSave: (delegateId: string, data: Partial<RegistrationFormState>) => void;
}

const EditDelegateModal = ({ delegate, onClose, onSave }: EditDelegateModalProps) => {
  const initialFormData: Partial<RegistrationFormState> = delegate ? {
    lastName: delegate.lastName,
    firstName: delegate.firstName,
    preferredName: delegate.preferredName || '',
    age: delegate.age.toString(),
    gender: delegate.gender,
    birthday: delegate.birthday,
    category: delegate.category,
    tshirtSize: delegate.tshirtSize,
    tshirtPrinted: delegate.tshirtPrinted ? 'Printed' : 'Not Printed',
    idPrinted: delegate.idPrinted ? 'Printed' : 'Not Printed',
  } : { tshirtPrinted: 'Not Printed' as const, idPrinted: 'Not Printed' as const };

  const [formData, setFormData] = useState<Partial<RegistrationFormState>>(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (delegate) {
      const printedValue = formData.tshirtPrinted === 'Printed';
      const idPrintedValue = formData.idPrinted === 'Printed';
      const saveData = {
        ...formData,
        tshirtPrinted: printedValue,
        idPrinted: idPrintedValue,
      };
      onSave(delegate.id, saveData as any);
    }
  };

  if (!delegate) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="view-title">Edit Delegate</h2>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label htmlFor="preferredName">Preferred Name (For ID)</label>
              <input type="text" id="preferredName" name="preferredName" value={formData.preferredName || ''} onChange={handleChange} placeholder="Name to print on ID badge" />
            </div>
            <div className="field-group">
              <label htmlFor="age">Age</label>
              <input type="number" id="age" name="age" value={formData.age || ''} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="birthday">Birthday</label>
              <input type="date" id="birthday" name="birthday" value={formData.birthday || ''} onChange={handleChange} />
            </div>
            <div className="field-group">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange}>
                <option value="High School (JHS)">High School (JHS)</option>
                <option value="Senior High School (SHS)">Senior High School (SHS)</option>
                <option value="College">College</option>
                <option value="Post-Grad">Post-Grad</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="tshirtSize">T-Shirt Size</label>
              <select id="tshirtSize" name="tshirtSize" value={formData.tshirtSize} onChange={handleChange}>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="tshirtPrinted">T-Shirt Printed</label>
              <select id="tshirtPrinted" name="tshirtPrinted" value={formData.tshirtPrinted} onChange={handleChange}>
                <option value="Not Printed">Not Printed</option>
                <option value="Printed">Printed</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="idPrinted">ID Printed</label>
              <select id="idPrinted" name="idPrinted" value={formData.idPrinted} onChange={handleChange}>
                <option value="Not Printed">Not Printed</option>
                <option value="Printed">Printed</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDelegateModal;
