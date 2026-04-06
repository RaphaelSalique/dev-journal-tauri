import React, { useState, useEffect } from 'react';

interface ActivityType {
  id?: number;
  name: string;
  description?: string;
  color: string;
  active: boolean;
}

interface ActivityTypeModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (activityTypeData: Omit<ActivityType, 'id' | 'active'>) => void;
  activityType?: ActivityType | null;
}

export default function ActivityTypeModal({
  show,
  onClose,
  onSave,
  activityType,
}: ActivityTypeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6c757d',
  });

  useEffect(() => {
    if (activityType) {
      setFormData({
        name: activityType.name,
        description: activityType.description || '',
        color: activityType.color,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6c757d',
      });
    }
  }, [activityType, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isValidHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{activityType ? "Modifier le type d'activité" : "Nouveau type d'activité"}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du type d'activité:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="form-group">
            <label>Couleur:</label>
            <div className="color-input-group">
              <input
                type="color"
                name="color"
                value={isValidHexColor(formData.color) ? formData.color : '#6c757d'}
                onChange={handleChange}
              />
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="#6c757d"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" className="btn-save">
              {activityType ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
