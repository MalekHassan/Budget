import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Languages, LogOut, Sun, Moon, Home, Pencil, Check, X, Users, FileSpreadsheet, Plus, ArrowRightLeft, UserPlus, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useHousehold } from '../hooks/useHousehold';
import { updateHouseholdName, findHouseholdsByEmail, createHousehold, updateUserProfile, addHouseholdMember, removeHouseholdMember } from '../firebase/firestore';
import { changeLanguage } from '../i18n';
import type { Household } from '../types';
import './SettingsPage.css';

function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('theme') as 'dark' | 'light') || 'light';
}

function setTheme(theme: 'dark' | 'light') {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { household } = useHousehold();
  const currentLang = i18n.language as 'en' | 'ar';
  const isAr = currentLang === 'ar';

  const [theme, setThemeState] = useState<'dark' | 'light'>(getTheme);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [availableHouseholds, setAvailableHouseholds] = useState<Household[]>([]);
  const [showHouseholdPicker, setShowHouseholdPicker] = useState(false);
  const [switchingHousehold, setSwitchingHousehold] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!user?.email) return;
    findHouseholdsByEmail(user.email).then(setAvailableHouseholds);
  }, [user?.email, household?.id]);

  const toggleTheme = () => {
    setThemeState((t) => t === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    changeLanguage(currentLang === 'en' ? 'ar' : 'en');
  };

  const startEditName = () => {
    setNameValue(household?.name || '');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!household || !nameValue.trim()) return;
    setSaving(true);
    try {
      await updateHouseholdName(household.id, nameValue.trim());
      setEditingName(false);
    } catch (err) {
      console.error('Update name error:', err);
    }
    setSaving(false);
  };

  const switchHousehold = async (targetId: string) => {
    if (!user || targetId === household?.id) return;
    setSwitchingHousehold(true);
    try {
      await updateUserProfile(user.uid, { householdId: targetId });
      window.location.reload();
    } catch (err) {
      console.error('Switch household error:', err);
    }
    setSwitchingHousehold(false);
  };

  const handleInvite = async () => {
    if (!household || !inviteEmail.trim()) return;
    const email = inviteEmail.trim().toLowerCase();
    if (household.members.includes(email)) {
      setInviteMsg(isAr ? 'هذا العضو موجود بالفعل' : 'Already a member');
      setTimeout(() => setInviteMsg(''), 2000);
      return;
    }
    setInviting(true);
    try {
      await addHouseholdMember(household.id, email);
      setInviteEmail('');
      setInviteMsg(isAr ? 'تمت الإضافة!' : 'Member added!');
      setTimeout(() => setInviteMsg(''), 2000);
    } catch (err) {
      console.error('Invite error:', err);
      setInviteMsg(isAr ? 'فشل في الإضافة' : 'Failed to add');
      setTimeout(() => setInviteMsg(''), 2000);
    }
    setInviting(false);
  };

  const handleRemoveMember = async (email: string) => {
    if (!household || email === user?.email) return;
    try {
      await removeHouseholdMember(household.id, email);
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const createNewBudget = async () => {
    if (!user) return;
    setSwitchingHousehold(true);
    try {
      const newId = await createHousehold(
        `${user.displayName}'s Budget`,
        user.email!
      );
      await updateUserProfile(user.uid, { householdId: newId });
      window.location.reload();
    } catch (err) {
      console.error('Create budget error:', err);
    }
    setSwitchingHousehold(false);
  };

  return (
    <div className="page fade-in">
      <h1 className="page-title">{t('settings.title')}</h1>

      {/* User Profile Card */}
      {user && (
        <div className="settings-profile glass-card">
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="settings-avatar" />
          )}
          <div className="settings-profile__info">
            <p className="settings-profile__name">{user.displayName}</p>
            <p className="settings-profile__email">{user.email}</p>
          </div>
        </div>
      )}

      {/* Recovery: No household loaded but user has available ones */}
      {!household && availableHouseholds.length > 0 && (
        <div className="settings-group">
          <h2 className="settings-group__title">{isAr ? 'اختر ميزانية' : 'Select a Budget'}</h2>
          <div className="settings-household-picker glass-card">
            {availableHouseholds.map((h) => (
              <div
                key={h.id}
                className="settings-household-option"
                onClick={() => switchHousehold(h.id)}
                role="button"
                tabIndex={0}
              >
                <Home size={16} />
                <div className="settings-household-info">
                  <span>{h.name}</span>
                  <span className="settings-household-members">{h.members.length} {isAr ? 'أعضاء' : 'members'}</span>
                </div>
              </div>
            ))}
            <div
              className="settings-household-option settings-household-option--create"
              onClick={createNewBudget}
              role="button"
              tabIndex={0}
            >
              <Plus size={16} />
              <span>{isAr ? 'إنشاء ميزانية جديدة' : 'Create New Budget'}</span>
            </div>
            {switchingHousehold && (
              <p className="settings-household-switching">
                {isAr ? 'جاري التبديل...' : 'Switching...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Household Section */}
      {household && (
        <div className="settings-group">
          <h2 className="settings-group__title">{t('settings.household')}</h2>

          <div className="settings-item glass-card">
            <div className="settings-row">
              <Home size={18} />
              {editingName ? (
                <input
                  className="settings-name-input"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  dir="auto"
                />
              ) : (
                <span>{household.name}</span>
              )}
            </div>
            {editingName ? (
              <div className="settings-actions">
                <button className="settings-icon-btn settings-icon-btn--success" onClick={saveName} disabled={saving}>
                  <Check size={16} />
                </button>
                <button className="settings-icon-btn" onClick={() => setEditingName(false)}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button className="settings-icon-btn" onClick={startEditName}>
                <Pencil size={14} />
              </button>
            )}
          </div>

          {/* Members */}
          <div
            className="settings-item glass-card"
            onClick={() => setShowMembers(!showMembers)}
            role="button"
            tabIndex={0}
          >
            <div className="settings-row">
              <Users size={18} />
              <span>{t('settings.members')}</span>
            </div>
            <span className="settings-value">{household.members.length}</span>
          </div>

          {showMembers && (
            <div className="settings-members-panel glass-card">
              {household.members.map((email) => (
                <div key={email} className="settings-member-row">
                  <Mail size={14} />
                  <span className="settings-member-email">{email}</span>
                  {email !== user?.email && (
                    <button
                      className="settings-member-remove"
                      onClick={() => handleRemoveMember(email)}
                      title={isAr ? 'إزالة' : 'Remove'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              {/* Invite */}
              <div className="settings-invite-row">
                <input
                  className="settings-invite-input"
                  type="email"
                  placeholder={isAr ? 'بريد إلكتروني للدعوة...' : 'Email to invite...'}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  dir="ltr"
                />
                <button
                  className="settings-invite-btn"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  <UserPlus size={16} />
                </button>
              </div>
              {inviteMsg && <p className="settings-invite-msg">{inviteMsg}</p>}
            </div>
          )}

          {/* Switch / Create Budget */}
          <div
            className="settings-item glass-card"
            onClick={() => setShowHouseholdPicker(!showHouseholdPicker)}
            role="button"
            tabIndex={0}
          >
            <div className="settings-row">
              <ArrowRightLeft size={18} />
              <span>{isAr ? 'تبديل / إنشاء ميزانية' : 'Switch / New Budget'}</span>
            </div>
          </div>

          {showHouseholdPicker && (
            <div className="settings-household-picker glass-card">
              {availableHouseholds.map((h) => (
                <div
                  key={h.id}
                  className={`settings-household-option ${h.id === household.id ? 'settings-household-option--active' : ''}`}
                  onClick={() => switchHousehold(h.id)}
                  role="button"
                  tabIndex={0}
                >
                  <Home size={16} />
                  <div className="settings-household-info">
                    <span>{h.name}</span>
                    <span className="settings-household-members">{h.members.length} {isAr ? 'أعضاء' : 'members'}</span>
                  </div>
                  {h.id === household.id && <Check size={14} />}
                </div>
              ))}
              <div
                className="settings-household-option settings-household-option--create"
                onClick={createNewBudget}
                role="button"
                tabIndex={0}
              >
                <Plus size={16} />
                <span>{isAr ? 'إنشاء ميزانية جديدة' : 'Create New Budget'}</span>
              </div>
              {switchingHousehold && (
                <p className="settings-household-switching">
                  {isAr ? 'جاري التبديل...' : 'Switching...'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferences */}
      <div className="settings-group">
        <h2 className="settings-group__title">{isAr ? 'التفضيلات' : 'Preferences'}</h2>

        <div className="settings-item glass-card" onClick={toggleTheme} role="button" tabIndex={0}>
          <div className="settings-row">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <span>{t('settings.theme')}</span>
          </div>
          <div className="settings-theme-toggle">
            <span className={`settings-theme-label ${theme === 'light' ? 'active' : ''}`}>
              {t('settings.light')}
            </span>
            <div className={`settings-toggle-track ${theme === 'dark' ? 'settings-toggle-track--dark' : ''}`}>
              <div className="settings-toggle-thumb" />
            </div>
            <span className={`settings-theme-label ${theme === 'dark' ? 'active' : ''}`}>
              {t('settings.dark')}
            </span>
          </div>
        </div>

        <div className="settings-item glass-card" onClick={toggleLanguage} role="button" tabIndex={0}>
          <div className="settings-row">
            <Languages size={18} />
            <span>{t('settings.language')}</span>
          </div>
          <span className="settings-value settings-value--highlight">
            {currentLang === 'en' ? 'العربية' : 'English'}
          </span>
        </div>
      </div>

      {/* Data */}
      <div className="settings-group">
        <h2 className="settings-group__title">{isAr ? 'البيانات' : 'Data'}</h2>
        <Link to="/import" className="settings-item glass-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="settings-row">
            <FileSpreadsheet size={18} />
            <span>{isAr ? 'استيراد من Google Sheets' : 'Import from Google Sheets'}</span>
          </div>
        </Link>
      </div>

      {/* Account */}
      <div className="settings-group">
        <div className="settings-item glass-card settings-danger" onClick={logout} role="button" tabIndex={0}>
          <div className="settings-row">
            <LogOut size={18} />
            <span>{t('auth.signOut')}</span>
          </div>
        </div>
      </div>

      {/* App Version */}
      <p className="settings-version">Home Budget v1.0.0</p>
    </div>
  );
}
