import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface Link {
  text: string;
  url: string;
}

interface JiraTicketRef {
  key: string;
  summary?: string;
}

interface JiraTicketForEntry {
  key: string;
  summary: string;
  status: string;
  is_selected: boolean;
  is_available: boolean;
}

interface JournalEntry {
  date: string;
  time_range: string;
  project: string;
  entry_type: string;
  description: string;
  duration: string;
  results: string;
  blockers: string;
  links: Link[];
  tags: string[];
  reflections: string;
  jira_tickets: JiraTicketRef[];
}

interface JournalEntryFormProps {
  onSubmit: (entry: JournalEntry) => void;
  initialData?: Partial<JournalEntry>;
  projects?: Array<{id: number, name: string}>;
  tags?: Array<{id: number, name: string, color?: string}>;
  availableJiraTickets?: Array<{key: string, fields: {summary: string}}>;
}

export default function JournalEntryForm({ 
  onSubmit, 
  initialData = {}, 
  projects = [], 
  tags = [], 
  availableJiraTickets = [] 
}: JournalEntryFormProps) {
  const [entry, setEntry] = useState<JournalEntry>({
    date: initialData.date || new Date().toISOString().split('T')[0],
    time_range: initialData.time_range || '',
    project: initialData.project || '',
    entry_type: initialData.entry_type || 'développement',
    description: initialData.description || '',
    duration: initialData.duration || '',
    results: initialData.results || '',
    blockers: initialData.blockers || '',
    links: initialData.links || [],
    tags: initialData.tags || [],
    reflections: initialData.reflections || '',
    jira_tickets: initialData.jira_tickets || [],
  });

  const [ticketsForEntry, setTicketsForEntry] = useState<JiraTicketForEntry[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEntry({ ...entry, [name]: value });
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Format as HH:MM-HH:MM
    if (value.length <= 4) {
      // First time only: HH:MM
      if (value.length >= 3) {
        value = value.slice(0, 2) + ':' + value.slice(2);
      }
    } else {
      // Both times: HH:MM-HH:MM
      const firstTime = value.slice(0, 4);
      const secondTime = value.slice(4, 8);
      
      let formatted = firstTime.slice(0, 2) + ':' + firstTime.slice(2);
      if (secondTime.length > 0) {
        formatted += '-';
        if (secondTime.length >= 3) {
          formatted += secondTime.slice(0, 2) + ':' + secondTime.slice(2);
        } else {
          formatted += secondTime;
        }
      }
      value = formatted;
    }
    
    setEntry({ ...entry, time_range: value });
  };

  const handleLinkChange = (index: number, field: keyof Link, value: string) => {
    const newLinks = [...entry.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setEntry({ ...entry, links: newLinks });
  };

  const addLink = () => {
    setEntry({ ...entry, links: [...entry.links, { text: '', url: '' }] });
  };

  // Fonctions pour les tickets Jira
  const loadTicketsForEntry = async () => {
    try {
      const selectedKeys = entry.jira_tickets.map(t => t.key);
      const tickets = await invoke<JiraTicketForEntry[]>('get_available_tickets_for_entry', {
        selectedTicketKeys: selectedKeys
      });
      setTicketsForEntry(tickets);
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
    }
  };

  const handleJiraTicketToggle = async (ticketKey: string) => {
    const existingIndex = entry.jira_tickets.findIndex(t => t.key === ticketKey);
    let newTickets = [...entry.jira_tickets];
    
    if (existingIndex >= 0) {
      // Enlever le ticket
      newTickets.splice(existingIndex, 1);
    } else {
      // Ajouter le ticket
      const ticket = ticketsForEntry.find(t => t.key === ticketKey);
      if (ticket) {
        newTickets.push({
          key: ticket.key,
          summary: ticket.summary
        });
      }
    }
    
    const updatedEntry = { ...entry, jira_tickets: newTickets };
    setEntry(updatedEntry);
    
    // Recharger la liste des tickets avec les nouvelles sélections
    const selectedKeys = newTickets.map(t => t.key);
    try {
      const tickets = await invoke<JiraTicketForEntry[]>('get_available_tickets_for_entry', {
        selectedTicketKeys: selectedKeys
      });
      setTicketsForEntry(tickets);
    } catch (error) {
      console.error('Erreur lors du rechargement des tickets:', error);
    }
  };

  // Charger les tickets au montage du composant et quand availableJiraTickets change
  useEffect(() => {
    if (availableJiraTickets.length > 0) {
      loadTicketsForEntry();
    }
  }, [availableJiraTickets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(entry);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Date:</label>
        <input 
          type="date" 
          name="date" 
          value={entry.date} 
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={(e) => {
            // Le calendrier se ferme automatiquement quand on clique à l'extérieur
          }}
          className="date-input"
          title="Cliquez à l'extérieur ou appuyez sur Échap pour fermer"
          required 
        />
      </div>

      <div>
        <label>Plage horaire (ex. 14:00-16:30):</label>
        <input 
          type="text" 
          name="time_range" 
          value={entry.time_range} 
          onChange={handleTimeRangeChange} 
          placeholder="14:00-16:30" 
          maxLength={11}
        />
      </div>

      <div>
        <label>Projet/Contexte:</label>
        {projects.length > 0 ? (
          <select name="project" value={entry.project} onChange={handleChange} required>
            <option value="">Sélectionner un projet</option>
            {projects.map(project => (
              <option key={project.id} value={project.name}>{project.name}</option>
            ))}
          </select>
        ) : (
          <input type="text" name="project" value={entry.project} onChange={handleChange} required />
        )}
      </div>

      <div>
        <label>Type d'activité:</label>
        <select name="entry_type" value={entry.entry_type} onChange={handleChange}>
          <option value="développement">Développement</option>
          <option value="revue de code">Revue de code</option>
          <option value="réunion">Réunion</option>
          <option value="debug">Debug</option>
          <option value="documentation">Documentation</option>
          <option value="formation">Formation</option>
          <option value="veille technologique">Veille technologique</option>
        </select>
      </div>

      <div>
        <label>Description:</label>
        <textarea name="description" value={entry.description} onChange={handleChange} required />
      </div>

      <div>
        <label>Durée:</label>
        <input type="text" name="duration" value={entry.duration} onChange={handleChange} placeholder="3h" required />
      </div>

      <div>
        <label>Résultats:</label>
        <textarea name="results" value={entry.results} onChange={handleChange} />
      </div>

      <div>
        <label>Blocages:</label>
        <textarea name="blockers" value={entry.blockers} onChange={handleChange} />
      </div>

      <div>
        <label>Liens utiles:</label>
        {entry.links.map((link, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder="Texte du lien"
              value={link.text}
              onChange={(e) => handleLinkChange(index, 'text', e.target.value)}
            />
            <input
              type="url"
              placeholder="URL"
              value={link.url}
              onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
            />
          </div>
        ))}
        <button type="button" onClick={addLink}>Ajouter un lien</button>
      </div>

      <div>
        <label>Tags:</label>
        {tags.length > 0 ? (
          <div className="tags-selector">
            <div className="available-tags">
              {tags.map(tag => (
                <label key={tag.id} className="tag-checkbox">
                  <input
                    type="checkbox"
                    checked={entry.tags.includes(tag.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEntry({ ...entry, tags: [...entry.tags, tag.name] });
                      } else {
                        setEntry({ ...entry, tags: entry.tags.filter(t => t !== tag.name) });
                      }
                    }}
                  />
                  <span className="tag-badge" style={{ backgroundColor: tag.color || '#667eea' }}>
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
            <input
              type="text"
              name="customTags"
              placeholder="Tags personnalisés (séparés par des espaces)"
              onChange={(e) => {
                const customTags = e.target.value.split(' ').filter(t => t.trim());
                const adminTags = entry.tags.filter(t => tags.some(tag => tag.name === t));
                setEntry({ ...entry, tags: [...adminTags, ...customTags] });
              }}
            />
          </div>
        ) : (
          <input
            type="text"
            name="tags"
            value={entry.tags.join(' ')}
            onChange={(e) => setEntry({ ...entry, tags: e.target.value.split(' ').filter(t => t.trim()) })}
            placeholder="#backend #api"
          />
        )}
      </div>

      <div>
        <label>Réflexions:</label>
        <textarea name="reflections" value={entry.reflections} onChange={handleChange} />
      </div>

      {/* Section Jira Tickets */}
      {ticketsForEntry.length > 0 && (
        <div className="form-group jira-tickets-section">
          <label>Tickets Jira:</label>
          <div className="jira-tickets-list">
            {ticketsForEntry.map(ticket => (
              <div key={ticket.key} className={`jira-ticket-item ${!ticket.is_available ? 'orphan' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={ticket.is_selected}
                    onChange={() => handleJiraTicketToggle(ticket.key)}
                  />
                  <span className="ticket-key">{ticket.key}</span>
                  <span className="ticket-summary">
                    {ticket.summary}
                    {!ticket.is_available && ' (non trouvé dans la requête JQL actuelle)'}
                  </span>
                  <span className="ticket-status">({ticket.status})</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit">Enregistrer</button>
    </form>
  );
}