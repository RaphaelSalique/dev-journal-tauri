import { useEffect, useState } from 'react';

type AdminEntityType = 'project' | 'tag' | 'activityType';
type AdminMode = 'create' | 'edit';

interface AdminEntityFormProps {
  entityType: AdminEntityType;
  mode: AdminMode;
  initialData?: {
    name?: string;
    description?: string;
    color?: string;
  } | null;
  onBack: () => void;
  onSave: (data: { name: string; description: string; color: string }) => void | Promise<void>;
}

const ENTITY_CONFIG: Record<AdminEntityType, {
  createTitle: string;
  editTitle: string;
  nameLabel: string;
  defaultColor: string;
}> = {
  project: {
    createTitle: 'Nouveau projet',
    editTitle: 'Modifier le projet',
    nameLabel: 'Nom du projet',
    defaultColor: '#007bff',
  },
  tag: {
    createTitle: 'Nouveau tag',
    editTitle: 'Modifier le tag',
    nameLabel: 'Nom du tag',
    defaultColor: '#6c757d',
  },
  activityType: {
    createTitle: "Nouveau type d'activité",
    editTitle: "Modifier le type d'activité",
    nameLabel: "Nom du type d'activité",
    defaultColor: '#6c757d',
  },
};

export default function AdminEntityForm({
  entityType,
  mode,
  initialData,
  onBack,
  onSave,
}: AdminEntityFormProps) {
  const config = ENTITY_CONFIG[entityType];
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: config.defaultColor,
  });

  useEffect(() => {
    setFormData({
      name: initialData?.name || '',
      description: initialData?.description || '',
      color: initialData?.color || config.defaultColor,
    });
  }, [initialData, config.defaultColor]);

  const isValidHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <div className="admin-form-screen">
      <div className="admin-form-header">
        <button type="button" className="btn-cancel" onClick={onBack}>
          Retour à la liste
        </button>
      </div>

      <div className="admin-form-card">
        <h3>{mode === 'create' ? config.createTitle : config.editTitle}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{config.nameLabel}:</label>
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
                value={isValidHexColor(formData.color) ? formData.color : config.defaultColor}
                onChange={handleChange}
              />
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder={config.defaultColor}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onBack} className="btn-cancel">
              Annuler
            </button>
            <button type="submit" className="btn-save">
              {mode === 'create' ? 'Créer' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
