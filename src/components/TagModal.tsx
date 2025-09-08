import React, { useState, useEffect } from 'react';

interface Tag {
  id?: number;
  name: string;
  description?: string;
  color: string;
  active: boolean;
}

interface TagModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (tagData: Omit<Tag, 'id' | 'active'>) => void;
  tag?: Tag | null;
}

export default function TagModal({ show, onClose, onSave, tag }: TagModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6c757d'
  });

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name,
        description: tag.description || '',
        color: tag.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#6c757d'
      });
    }
  }, [tag, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (!show) return null;

  const commonColors = [
    '#dc3545', // Rouge
    '#28a745', // Vert
    '#007bff', // Bleu
    '#ffc107', // Jaune
    '#17a2b8', // Cyan
    '#6f42c1', // Violet
    '#fd7e14', // Orange
    '#6c757d', // Gris
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{tag ? 'Modifier le tag' : 'Nouveau tag'}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du tag:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
              placeholder="ex: bug, feature, documentation"
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="form-group">
            <label>Couleur:</label>
            <div className="color-input-group">
              <input
                type="color"
                name="color"
                value={formData.color}
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
            
            <div className="color-presets">
              <span>Couleurs prédéfinies:</span>
              <div className="color-palette">
                {commonColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-preset ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" className="btn-save">
              {tag ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}