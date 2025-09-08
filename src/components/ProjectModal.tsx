import React, { useState, useEffect } from 'react';

interface Project {
  id?: number;
  name: string;
  description?: string;
  color: string;
  active: boolean;
}

interface ProjectModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id' | 'active'>) => void;
  project?: Project | null;
}

export default function ProjectModal({ show, onClose, onSave, project }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#007bff'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        color: project.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#007bff'
      });
    }
  }, [project, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{project ? 'Modifier le projet' : 'Nouveau projet'}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom du projet:</label>
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
                value={formData.color}
                onChange={handleChange}
              />
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="#007bff"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" className="btn-save">
              {project ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}