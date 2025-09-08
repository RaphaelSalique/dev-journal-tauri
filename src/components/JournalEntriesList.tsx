import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

interface Link {
  text: string;
  url: string;
}

interface ParsedJournalEntry {
  timestamp: string;
  project: string;
  description: string;
  duration: string;
  tags: string[];
  time_range: string;
  entry_type: string;
  results: string;
  blockers: string;
  links: Link[];
  reflections: string;
  jira_tickets: JiraTicketRef[];
}

interface JournalEntriesListProps {
  date: string;
  onRefresh: () => void;
  projects: Array<{id: number, name: string}>;
  tags: Array<{id: number, name: string, color?: string}>;
  availableJiraTickets: Array<{key: string, fields: {summary: string}}>;
}

export default function JournalEntriesList({ 
  date, 
  onRefresh, 
  projects, 
  tags: _tags, 
  availableJiraTickets: _availableJiraTickets 
}: JournalEntriesListProps) {
  const [entries, setEntries] = useState<ParsedJournalEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedJournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticketsForEntry, setTicketsForEntry] = useState<JiraTicketForEntry[]>([]);

  useEffect(() => {
    if (date) {
      loadEntries();
    }
  }, [date]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const parsedEntries = await invoke<ParsedJournalEntry[]>('parse_journal_entries_cmd', { date });
      setEntries(parsedEntries);
    } catch (error) {
      console.error('Erreur lors du chargement des entrées:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketsForEntry = async (entry: ParsedJournalEntry) => {
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

  const handleEdit = async (index: number) => {
    setEditingIndex(index);
    const entry = { ...entries[index] };
    setEditForm(entry);
    await loadTicketsForEntry(entry);
  };

  const handleSave = async () => {
    if (editForm && editingIndex !== null) {
      try {
        setLoading(true);
        const success = await invoke<boolean>('update_journal_entry_cmd', {
          date,
          entryIndex: editingIndex,
          updatedEntry: editForm
        });
        
        if (success) {
          await loadEntries();
          setEditingIndex(null);
          setEditForm(null);
          onRefresh();
        } else {
          alert('Erreur lors de la mise à jour de l\'entrée');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (index: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      try {
        setLoading(true);
        const success = await invoke<boolean>('delete_journal_entry_cmd', {
          date,
          entryIndex: index
        });
        
        if (success) {
          await loadEntries();
          onRefresh();
        } else {
          alert('Erreur lors de la suppression de l\'entrée');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleFormChange = (field: keyof ParsedJournalEntry, value: any) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const handleJiraTicketToggle = async (ticketKey: string) => {
    if (!editForm) return;
    
    const existingIndex = editForm.jira_tickets.findIndex(t => t.key === ticketKey);
    let newTickets = [...editForm.jira_tickets];
    
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
    
    const updatedForm = { ...editForm, jira_tickets: newTickets };
    setEditForm(updatedForm);
    
    // Recharger la liste des tickets avec les nouvelles sélections
    await loadTicketsForEntry(updatedForm);
  };

  if (loading) {
    return <div className="loading">Chargement des entrées...</div>;
  }

  return (
    <div className="journal-entries">
      <h3>Entrées du journal ({entries.length})</h3>
      
      {entries.length === 0 ? (
        <p>Aucune entrée pour cette date.</p>
      ) : (
        <div className="entries-list">
          {entries.map((entry, index) => (
            <div key={index} className="entry-card">
              {editingIndex === index ? (
                // Formulaire d'édition
                <div className="edit-form">
                  <h4>Édition de l'entrée - {entry.timestamp}</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Projet:</label>
                      <select 
                        value={editForm?.project || ''}
                        onChange={(e) => handleFormChange('project', e.target.value)}
                      >
                        <option value="">Sélectionner un projet</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.name}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Type d'activité:</label>
                      <select 
                        value={editForm?.entry_type || ''}
                        onChange={(e) => handleFormChange('entry_type', e.target.value)}
                      >
                        <option value="développement">Développement</option>
                        <option value="revue de code">Revue de code</option>
                        <option value="réunion">Réunion</option>
                        <option value="debug">Debug</option>
                        <option value="documentation">Documentation</option>
                        <option value="formation">Formation</option>
                        <option value="veille technologique">Veille technologique</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Plage horaire:</label>
                      <input 
                        type="text" 
                        value={editForm?.time_range || ''}
                        onChange={(e) => handleFormChange('time_range', e.target.value)}
                        placeholder="14:00-16:30"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Durée:</label>
                      <input 
                        type="text" 
                        value={editForm?.duration || ''}
                        onChange={(e) => handleFormChange('duration', e.target.value)}
                        placeholder="3h"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description:</label>
                    <textarea 
                      value={editForm?.description || ''}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Résultats:</label>
                    <textarea 
                      value={editForm?.results || ''}
                      onChange={(e) => handleFormChange('results', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Blocages:</label>
                    <textarea 
                      value={editForm?.blockers || ''}
                      onChange={(e) => handleFormChange('blockers', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tags:</label>
                    <input 
                      type="text" 
                      value={editForm?.tags.join(' ') || ''}
                      onChange={(e) => handleFormChange('tags', e.target.value.split(' ').filter(t => t.trim()))}
                      placeholder="#backend #api"
                    />
                  </div>

                  <div className="form-group">
                    <label>Réflexions:</label>
                    <textarea 
                      value={editForm?.reflections || ''}
                      onChange={(e) => handleFormChange('reflections', e.target.value)}
                      rows={2}
                    />
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

                  <div className="form-actions">
                    <button onClick={handleSave} disabled={loading} className="btn-save">
                      Sauvegarder
                    </button>
                    <button onClick={handleCancel} disabled={loading} className="btn-cancel">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // Affichage normal
                <div className="entry-display">
                  <div className="entry-header">
                    <h4>{entry.timestamp}</h4>
                    <div className="entry-actions">
                      <button onClick={() => handleEdit(index)} className="btn-sm btn-edit">
                        Éditer
                      </button>
                      <button onClick={() => handleDelete(index)} className="btn-sm btn-delete">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  
                  <div className="entry-content">
                    <div><strong>Projet:</strong> {entry.project}</div>
                    {entry.time_range && <div><strong>Plage horaire:</strong> {entry.time_range}</div>}
                    <div><strong>Type:</strong> {entry.entry_type}</div>
                    <div><strong>Durée:</strong> {entry.duration}</div>
                    <div><strong>Description:</strong> {entry.description}</div>
                    
                    {entry.results && <div><strong>Résultats:</strong> {entry.results}</div>}
                    {entry.blockers && <div><strong>Blocages:</strong> {entry.blockers}</div>}
                    
                    {entry.tags.length > 0 && (
                      <div><strong>Tags:</strong> {entry.tags.map(tag => `#${tag}`).join(' ')}</div>
                    )}
                    
                    {entry.jira_tickets.length > 0 && (
                      <div>
                        <strong>Tickets Jira:</strong>{' '}
                        {entry.jira_tickets.map(ticket => ticket.key).join(', ')}
                      </div>
                    )}
                    
                    {entry.reflections && <div><strong>Réflexions:</strong> {entry.reflections}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}