import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import JournalEntryForm from './components/JournalEntryForm';
import JournalEntriesList from './components/JournalEntriesList';
import ProjectModal from './components/ProjectModal';
import TagModal from './components/TagModal';
import ThemeToggle from './components/ThemeToggle';
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState('journal');
  const [journalDates, setJournalDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentContent, setCurrentContent] = useState('');
  const [jiraTickets, setJiraTickets] = useState<any[]>([]);
  const [jiraQuery, setJiraQuery] = useState('');
  const [isLoadingJira, setIsLoadingJira] = useState(false);
  
  // États pour l'administration
  const [projects, setProjects] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  
  // États pour la gestion des modales
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingTag, setEditingTag] = useState<any>(null);
  
  // États pour les rapports d'activité
  const [activityReport, setActivityReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  
  // État pour forcer le refresh de la liste des entrées
  const [entriesRefreshKey, setEntriesRefreshKey] = useState(0);
  
  // État pour le thème
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    loadJournalDates();
    loadSavedJqlQuery();
    loadProjectsAndTags();
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark-theme', isDarkTheme);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);
  
  const toggleTheme = () => {
    setIsDarkTheme(prev => !prev);
  };

  const loadProjectsAndTags = async () => {
    try {
      const loadedProjects = await invoke<any[]>('get_all_projects', { includeInactive: false });
      setProjects(loadedProjects);
      
      const loadedTags = await invoke<any[]>('get_all_tags', { includeInactive: false });
      setTags(loadedTags);
    } catch (error) {
      console.error('Erreur lors du chargement des projets/tags:', error);
    }
  };

  const loadJournalDates = async () => {
    try {
      const dates = await invoke<string[]>('get_journal_dates');
      setJournalDates(dates);
    } catch (error) {
      console.error('Erreur lors du chargement des dates:', error);
    }
  };

  const loadSavedJqlQuery = async () => {
    try {
      const savedQuery = await invoke<string | null>('get_preference', { key: 'jira_jql_query' });
      if (savedQuery) {
        setJiraQuery(savedQuery);
        setIsLoadingJira(true);
        try {
          const tickets = await invoke<any[]>('fetch_jira_tickets', { query: savedQuery });
          setJiraTickets(tickets);
        } catch (error) {
          console.error("Erreur lors du chargement automatique des tickets Jira :", error);
        } finally {
          setIsLoadingJira(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la requête JQL:', error);
    }
  };

  const loadJournal = async (date: string) => {
    try {
      const content = await invoke<string>('load_journal_file_cmd', { date });
      setCurrentDate(date);
      setCurrentContent(content || '');
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error);
    }
  };

  const handleSubmit = async (entry: any) => {
    try {
      await invoke('save_journal_entry_cmd', { date: currentDate, entry });
      const updatedContent = await invoke<string>('load_journal_file_cmd', { date: currentDate });
      setCurrentContent(updatedContent);
      await loadJournalDates();
      // Forcer le refresh de la liste des entrées
      setEntriesRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const fetchJiraTickets = async () => {
    try {
      setIsLoadingJira(true);
      const tickets = await invoke<any[]>('fetch_jira_tickets', { query: jiraQuery });
      setJiraTickets(tickets);
      await invoke('set_preference', { key: 'jira_jql_query', value: jiraQuery });
    } catch (error) {
      console.error("Erreur Jira :", error);
      alert(`Erreur Jira: ${error}`);
    } finally {
      setIsLoadingJira(false);
    }
  };


  const handleJiraQueryChange = async (newQuery: string) => {
    setJiraQuery(newQuery);
    try {
      await invoke('set_preference', { key: 'jira_jql_query', value: newQuery });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la requête JQL:', error);
    }
  };

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'journal') {
      try {
        const savedQuery = await invoke<string | null>('get_preference', { key: 'jira_jql_query' });
        console.log('Requête JQL rechargée pour l\'onglet Journal:', savedQuery);
        window.dispatchEvent(new CustomEvent('jqlQueryUpdated', { detail: savedQuery }));
      } catch (error) {
        console.error('Erreur lors du rechargement de la requête JQL:', error);
      }
    }
  };

  // Gestion des projets
  const handleDeleteProject = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      try {
        await invoke('delete_project', { id });
        await loadProjectsAndTags();
      } catch (error) {
        console.error('Erreur lors de la suppression du projet:', error);
        alert('Erreur lors de la suppression du projet');
      }
    }
  };

  const handleToggleProjectStatus = async (id: number) => {
    try {
      await invoke('toggle_project_status', { id });
      await loadProjectsAndTags();
    } catch (error) {
      console.error('Erreur lors du changement de statut du projet:', error);
    }
  };

  const handleSaveProject = async (projectData: any) => {
    try {
      if (editingProject) {
        await invoke('update_project', {
          id: editingProject.id,
          name: projectData.name,
          description: projectData.description,
          color: projectData.color
        });
      } else {
        await invoke('create_project', {
          name: projectData.name,
          description: projectData.description,
          color: projectData.color
        });
      }
      await loadProjectsAndTags();
      setShowProjectModal(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du projet:', error);
      alert('Erreur lors de la sauvegarde du projet');
    }
  };

  // Gestion des tags
  const handleDeleteTag = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce tag ?')) {
      try {
        await invoke('delete_tag', { id });
        await loadProjectsAndTags();
      } catch (error) {
        console.error('Erreur lors de la suppression du tag:', error);
        alert('Erreur lors de la suppression du tag');
      }
    }
  };

  const handleToggleTagStatus = async (id: number) => {
    try {
      await invoke('toggle_tag_status', { id });
      await loadProjectsAndTags();
    } catch (error) {
      console.error('Erreur lors du changement de statut du tag:', error);
    }
  };

  const handleSaveTag = async (tagData: any) => {
    try {
      if (editingTag) {
        await invoke('update_tag', {
          id: editingTag.id,
          name: tagData.name,
          description: tagData.description,
          color: tagData.color
        });
      } else {
        await invoke('create_tag', {
          name: tagData.name,
          description: tagData.description,
          color: tagData.color
        });
      }
      await loadProjectsAndTags();
      setShowTagModal(false);
      setEditingTag(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du tag:', error);
      alert('Erreur lors de la sauvegarde du tag');
    }
  };

  // Génération de rapport d'activité
  const generateActivityReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      alert('Veuillez sélectionner une période pour le rapport');
      return;
    }
    
    try {
      setReportLoading(true);
      const report = await invoke<any>('generate_activity_report', {
        startDate: reportStartDate,
        endDate: reportEndDate
      });
      setActivityReport(report);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setReportLoading(false);
    }
  };

  const exportReport = () => {
    if (!activityReport) return;
    
    const dataStr = JSON.stringify(activityReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `rapport-activite-${reportStartDate}-${reportEndDate}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportReportToDOCX = async () => {
    if (!activityReport) return;
    
    try {
      // Demander à l'utilisateur où sauvegarder le fichier
      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: `rapport-activite-${reportStartDate}-${reportEndDate}.docx`,
        filters: [{
          name: 'Documents Word',
          extensions: ['docx']
        }]
      });
      
      if (filePath) {
        const result = await invoke<string>('export_activity_report_to_docx', {
          startDate: reportStartDate,
          endDate: reportEndDate,
          filePath
        });
        
        alert(`Rapport exporté avec succès!\n${result}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export DOCX:', error);
      alert(`Erreur lors de l'export: ${error}`);
    }
  };

  return (
    <div className="container">
      <div className="app-header">
        <h1>Journal de Développement</h1>
        <ThemeToggle isDark={isDarkTheme} onToggle={toggleTheme} />
      </div>

      <div className="tab-navigation">
        <button onClick={() => handleTabChange('journal')} className="tab-button">
          Journal
        </button>
        <button onClick={() => handleTabChange('jira')} className="tab-button">
          Tickets Jira
        </button>
        <button onClick={() => handleTabChange('admin')} className="tab-button">
          Administration
        </button>
        <button onClick={() => handleTabChange('analytics')} className="tab-button">
          Analytics
        </button>
      </div>

      {activeTab === 'journal' ? (
        <div className="tab-content">
          <div className="date-selector">
            <label>Sélectionner un journal:</label>
            <div className="date-controls">
              <select value={currentDate} onChange={(e) => loadJournal(e.target.value)} className="journal-select">
                <option value={new Date().toISOString().split('T')[0]}>
                  Aujourd'hui ({new Date().toISOString().split('T')[0]})
                </option>
                {journalDates.map(date => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
              <input 
                type="date" 
                value={currentDate} 
                onChange={(e) => loadJournal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onBlur={() => {
                  // Le calendrier se ferme automatiquement quand on clique à l'extérieur
                }}
                className="date-input"
                title="Cliquez à l'extérieur ou appuyez sur Échap pour fermer"
              />
            </div>
          </div>

          <JournalEntryForm 
            onSubmit={handleSubmit}
            projects={projects}
            tags={tags}
            availableJiraTickets={jiraTickets}
          />

          <JournalEntriesList 
            key={entriesRefreshKey}
            date={currentDate}
            onRefresh={loadJournalDates}
            projects={projects}
            tags={tags}
            availableJiraTickets={jiraTickets}
          />

          <div className="journal-content">
            <h2>Contenu du journal (markdown)</h2>
            <pre>{currentContent}</pre>
          </div>
        </div>
      ) : activeTab === 'jira' ? (
        <div className="tab-content">
          <h2>Tickets Jira</h2>
          <div className="jira-search">
            <label>Requête JQL:</label>
            <div className="jira-input-group">
              <input
                type="text"
                value={jiraQuery}
                onChange={(e) => handleJiraQueryChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchJiraTickets()}
                placeholder="ex: project = 'Projet A'"
                disabled={isLoadingJira}
              />
              <button onClick={fetchJiraTickets} disabled={isLoadingJira} className="jira-button">
                {isLoadingJira ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>

          <div>
            {jiraTickets.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Clé</th>
                    <th>Résumé</th>
                    <th>Statut</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {jiraTickets.map(ticket => (
                    <tr key={ticket.key}>
                      <td>{ticket.key}</td>
                      <td>{ticket.fields.summary}</td>
                      <td>{ticket.fields.status.name}</td>
                      <td>{ticket.fields.issuetype.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Aucun ticket trouvé. Vérifie ta requête JQL ou configure Jira dans ton fichier .env.</p>
            )}
          </div>
        </div>
      ) : activeTab === 'admin' ? (
        <div className="tab-content">
          <h2>Administration</h2>
          
          <div className="admin-section">
            <div className="admin-header">
              <h3>Projets ({projects.length})</h3>
              <button 
                className="btn-create"
                onClick={() => {
                  setEditingProject(null);
                  setShowProjectModal(true);
                }}
              >
                Nouveau Projet
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Couleur</th>
                  <th>Actif</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.sort(function (a, b) { return a.name.localeCompare(b.name); }).map(project => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.description}</td>
                    <td>
                      <span className="color-badge" style={{ backgroundColor: project.color }}>
                        {project.color}
                      </span>
                    </td>
                    <td>
                      <span className={project.active ? 'status-active' : 'status-inactive'}>
                        {project.active ? '✅' : '❌'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-sm btn-edit"
                          onClick={() => {
                            setEditingProject(project);
                            setShowProjectModal(true);
                          }}
                        >
                          Éditer
                        </button>
                        <button 
                          className="btn-sm btn-delete"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Supprimer
                        </button>
                        <button 
                          className="btn-sm"
                          onClick={() => handleToggleProjectStatus(project.id)}
                          style={{ background: project.active ? '#ffc107' : '#28a745' }}
                        >
                          {project.active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-section">
            <div className="admin-header">
              <h3>Tags ({tags.length})</h3>
              <button 
                className="btn-create" 
                style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
                onClick={() => {
                  setEditingTag(null);
                  setShowTagModal(true);
                }}
              >
                Nouveau Tag
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>Couleur</th>
                  <th>Actif</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.sort(function (a, b) { return a.name.localeCompare(b.name); }).map(tag => (
                  <tr key={tag.id}>
                    <td>{tag.name}</td>
                    <td>{tag.description}</td>
                    <td>
                      <span className="color-badge" style={{ backgroundColor: tag.color }}>
                        {tag.color}
                      </span>
                    </td>
                    <td>
                      <span className={tag.active ? 'status-active' : 'status-inactive'}>
                        {tag.active ? '✅' : '❌'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-sm btn-edit"
                          onClick={() => {
                            setEditingTag(tag);
                            setShowTagModal(true);
                          }}
                        >
                          Éditer
                        </button>
                        <button 
                          className="btn-sm btn-delete"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          Supprimer
                        </button>
                        <button 
                          className="btn-sm"
                          onClick={() => handleToggleTagStatus(tag.id)}
                          style={{ background: tag.active ? '#ffc107' : '#28a745' }}
                        >
                          {tag.active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="tab-content">
          <h2>Analytics & Rapports d'Activité</h2>
          
          {/* Générateur de rapport */}
          <div className="report-generator">
            <h3>Générer un Rapport d'Activité</h3>
            <div className="report-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Date de début:</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={() => {
                      // Le calendrier se ferme automatiquement quand on clique à l'extérieur
                    }}
                    className="date-input"
                    title="Cliquez à l'extérieur ou appuyez sur Échap pour fermer"
                  />
                </div>
                <div className="form-group">
                  <label>Date de fin:</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={() => {
                      // Le calendrier se ferme automatiquement quand on clique à l'extérieur
                    }}
                    className="date-input"
                    title="Cliquez à l'extérieur ou appuyez sur Échap pour fermer"
                  />
                </div>
                <div className="form-group">
                  <button 
                    onClick={generateActivityReport}
                    disabled={reportLoading}
                    className="btn-generate-report"
                  >
                    {reportLoading ? 'Génération...' : 'Générer le Rapport'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rapport généré */}
          {activityReport && (
            <div className="activity-report">
              <div className="report-header">
                <h3>Rapport d'Activité - {activityReport.period_start} au {activityReport.period_end}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={exportReport} className="btn-export">
                    Exporter JSON
                  </button>
                  <button onClick={exportReportToDOCX} className="btn-export">
                    Exporter DOCX
                  </button>
                </div>
              </div>
              
              {/* Résumé général */}
              <div className="report-summary">
                <div className="summary-card">
                  <h4>Total Entrées</h4>
                  <span className="summary-value">{activityReport.total_entries}</span>
                </div>
                <div className="summary-card">
                  <h4>Total Heures</h4>
                  <span className="summary-value">{activityReport.total_hours.toFixed(1)}h</span>
                </div>
                <div className="summary-card">
                  <h4>Moyenne/Jour</h4>
                  <span className="summary-value">
                    {Object.keys(activityReport.daily_breakdown).length > 0 ? 
                      (activityReport.total_hours / Object.keys(activityReport.daily_breakdown).length).toFixed(1) : 0}h
                  </span>
                </div>
              </div>

              {/* Projets */}
              {activityReport.projects_summary.length > 0 && (
                <div className="report-section">
                  <h4>Répartition par Projets</h4>
                  <div className="projects-chart">
                    {activityReport.projects_summary.map((project: any) => (
                      <div key={project.name} className="project-bar">
                        <div className="project-info">
                          <span className="project-name" style={{ color: project.color }}>
                            {project.name}
                          </span>
                          <span className="project-stats">
                            {project.entries} entrées - {project.hours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${(project.hours / activityReport.total_hours) * 100}%`,
                              backgroundColor: project.color 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {activityReport.tags_summary.length > 0 && (
                <div className="report-section">
                  <h4>Tags les plus utilisés</h4>
                  <div className="tags-cloud">
                    {activityReport.tags_summary.map((tag: any) => (
                      <span 
                        key={tag.name} 
                        className="tag-item"
                        style={{ 
                          backgroundColor: tag.color,
                          fontSize: `${Math.min(16, 10 + tag.count * 2)}px`
                        }}
                      >
                        {tag.name} ({tag.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Types d'activité */}
              {Object.keys(activityReport.activity_types).length > 0 && (
                <div className="report-section">
                  <h4>Types d'Activité</h4>
                  <div className="activity-types">
                    {Object.entries(activityReport.activity_types).map(([type, count]: [string, any]) => (
                      <div key={type} className="activity-type-item">
                        <span className="activity-type">{type}</span>
                        <span className="activity-count">{count} fois</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ventilation mensuelle avec détails */}
              {activityReport.monthly_details && activityReport.monthly_details.length > 0 && (
                <div className="report-section">
                  <h4>Répartition par Mois</h4>
                  <div className="monthly-details">
                    {activityReport.monthly_details.map((monthData: any) => (
                      <div key={monthData.month} className="monthly-detail-card">
                        <div className="monthly-header">
                          <div className="monthly-info">
                            <span className="monthly-name">
                              {new Date(monthData.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </span>
                            <span className="monthly-hours">
                              {monthData.hours.toFixed(1)}h
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ 
                                width: `${(monthData.hours / activityReport.total_hours) * 100}%`,
                                backgroundColor: '#667eea'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Projets du mois avec heures */}
                        {monthData.projects.length > 0 && (
                          <div className="monthly-projects">
                            <strong>Projets :</strong>
                            <div className="monthly-breakdown-items">
                              {monthData.projects.map((project: string) => (
                                <div key={project} className="breakdown-item">
                                  <span className="monthly-item project-item">
                                    {project}
                                  </span>
                                  <span className="hours-badge">
                                    {monthData.project_hours[project]?.toFixed(1) || '0.0'}h
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Tags du mois avec heures */}
                        {monthData.tags.length > 0 && (
                          <div className="monthly-tags">
                            <strong>Tags :</strong>
                            <div className="monthly-breakdown-items">
                              {monthData.tags.map((tag: string) => (
                                <div key={tag} className="breakdown-item">
                                  <span className="monthly-item tag-item">
                                    #{tag}
                                  </span>
                                  <span className="hours-badge">
                                    {monthData.tag_hours[tag]?.toFixed(1) || '0.0'}h
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Statistiques générales */}
          <div className="analytics-card">
            <h3>Statistiques générales</h3>
            <ul>
              <li>
                <span>Dates de journal disponibles</span>
                <span className="analytics-value">{journalDates.length}</span>
              </li>
              <li>
                <span>Projets configurés</span>
                <span className="analytics-value">{projects.length}</span>
              </li>
              <li>
                <span>Tags disponibles</span>
                <span className="analytics-value">{tags.length}</span>
              </li>
              <li>
                <span>Tickets Jira chargés</span>
                <span className="analytics-value">{jiraTickets.length}</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {/* Modales */}
      <ProjectModal
        show={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        project={editingProject}
      />

      <TagModal
        show={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setEditingTag(null);
        }}
        onSave={handleSaveTag}
        tag={editingTag}
      />
    </div>
  );
}
