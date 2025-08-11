import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, Minus, Loader2, User, UserX, Award } from 'lucide-react';

// Tailwind CSS is assumed to be available
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('kpis');
  const [kpiData, setKpiData] = useState([]);
  const [previousKpiData, setPreviousKpiData] = useState([]);
  const [newStartersData, setNewStartersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initialTeam = [
    { name: 'Cath', applicationScreening: 0, zoomInterviews: 0, profileCreation: 0, endorsedCandidates: 0, leadGeneration: 0 },
    { name: 'Jade', applicationScreening: 0, zoomInterviews: 0, profileCreation: 0, endorsedCandidates: 0, leadGeneration: 0 },
    { name: 'Lorenz', applicationScreening: 0, zoomInterviews: 0, profileCreation: 0, endorsedCandidates: 0, leadGeneration: 0 },
    { name: 'Marvin', applicationScreening: 0, zoomInterviews: 0, profileCreation: 0, endorsedCandidates: 0, leadGeneration: 0 },
    { name: 'Jewel', applicationScreening: 0, zoomInterviews: 0, profileCreation: 0, endorsedCandidates: 0, leadGeneration: 0 },
  ];

  const initialNewStarters = [
    { name: 'Cath', newStarters: 0, fallOuts: 0 },
    { name: 'Jade', newStarters: 0, fallOuts: 0 },
    { name: 'Lorenz', newStarters: 0, fallOuts: 0 },
    { name: 'Marvin', newStarters: 0, fallOuts: 0 },
    { name: 'Jewel', newStarters: 0, fallOuts: 0 },
  ];

  const kpiTargets = {
    applicationScreening: 4,
    zoomInterviews: 15,
    profileCreation: 100,
    endorsedCandidates: 5,
    leadGeneration: 10,
  };

  useEffect(() => {
    if (!firebaseConfig.apiKey) {
      setError("Firebase config is missing. Please check your environment.");
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          
          const kpiDocRef = doc(firestore, 'artifacts', appId, 'public', 'data', 'kpi_dashboard', 'team_data');
          const newStartersDocRef = doc(firestore, 'artifacts', appId, 'public', 'data', 'new_starters_dashboard', 'team_data');
          
          const unsubscribeKpi = onSnapshot(kpiDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setKpiData(data.current_week_data || initialTeam);
              setPreviousKpiData(data.previous_week_data || initialTeam);
            } else {
              setDoc(kpiDocRef, { current_week_data: initialTeam, previous_week_data: initialTeam });
            }
            setLoading(false);
          }, (err) => {
            setError("Failed to fetch KPI dashboard data: " + err.message);
            setLoading(false);
          });
          
          const unsubscribeNewStarters = onSnapshot(newStartersDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setNewStartersData(data.team || initialNewStarters);
            } else {
              setDoc(newStartersDocRef, { team: initialNewStarters });
            }
            setLoading(false);
          }, (err) => {
            setError("Failed to fetch New Starters dashboard data: " + err.message);
            setLoading(false);
          });

          return () => {
            unsubscribeKpi();
            unsubscribeNewStarters();
          };

        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (e) {
            setError("Failed to sign in: " + e.message);
            setLoading(false);
          }
        }
      });
      return () => unsubscribeAuth();
    } catch (e) {
      setError("Failed to initialize Firebase: " + e.message);
      setLoading(false);
    }
  }, []);

  const handleKpiInputChange = (event, name, kpiKey) => {
    const { value } = event.target;
    const newKpiData = kpiData.map(member => {
      if (member.name === name) {
        return { ...member, [kpiKey]: parseInt(value, 10) || 0 };
      }
      return member;
    });
    setKpiData(newKpiData);
  };

  const updateKpiInFirestore = async () => {
    if (!db || !userId) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'kpi_dashboard', 'team_data');
    try {
      await updateDoc(docRef, { current_week_data: kpiData });
    } catch (e) {
      console.error("Error updating KPI document: ", e);
    }
  };

  const handleNewStartersInputChange = (event, name, kpiKey) => {
    const { value } = event.target;
    const newNewStartersData = newStartersData.map(member => {
      if (member.name === name) {
        return { ...member, [kpiKey]: parseInt(value, 10) || 0 };
      }
      return member;
    });
    setNewStartersData(newNewStartersData);
  };

  const updateNewStartersInFirestore = async () => {
    if (!db || !userId) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'new_starters_dashboard', 'team_data');
    try {
      await updateDoc(docRef, { team: newNewStartersData });
    } catch (e) {
      console.error("Error updating New Starters document: ", e);
    }
  };

  const getKPIStatus = (kpiKey, value) => {
    const target = kpiTargets[kpiKey];
    if (kpiKey === 'applicationScreening') {
      if (value <= target) return 'bg-green-500';
      if (value > target && value <= target + 2) return 'bg-yellow-500';
      return 'bg-red-500';
    } else if (kpiKey === 'profileCreation') {
      return value >= target ? 'bg-green-500' : 'bg-red-500';
    } else {
      if (value >= target) return 'bg-green-500';
      if (value >= target * 0.75) return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  const calculateScore = (member) => {
    let score = 0;
    const kpis = Object.keys(kpiTargets);
    kpis.forEach(kpiKey => {
      const value = member[kpiKey] || 0;
      const target = kpiTargets[kpiKey];
      if (kpiKey === 'applicationScreening') {
        score += Math.max(0, 1 - (value / target));
      } else if (kpiKey === 'profileCreation') {
        score += value >= target ? 1 : 0;
      } else {
        score += Math.min(1, value / target);
      }
    });
    return (score / kpis.length) * 100;
  };

  const getTrendIcon = (member, kpiKey) => {
    const prevMember = previousKpiData.find(p => p.name === member.name);
    if (!prevMember || prevMember[kpiKey] === undefined) {
      return null;
    }
    const prevValue = prevMember[kpiKey];
    const currentValue = member[kpiKey];
    if (kpiKey === 'applicationScreening') {
      if (currentValue < prevValue) return <ArrowUp className="w-4 h-4 text-green-500" />;
      if (currentValue > prevValue) return <ArrowDown className="w-4 h-4 text-red-500" />;
      return <Minus className="w-4 h-4 text-gray-500" />;
    } else {
      if (currentValue > prevValue) return <ArrowUp className="w-4 h-4 text-green-500" />;
      if (currentValue < prevValue) return <ArrowDown className="w-4 h-4 text-red-500" />;
      return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const calculateFalloutRate = (newStarters, fallOuts) => {
    if (newStarters === 0) return 0;
    return (fallOuts / newStarters) * 100;
  };

  const getRateColor = (rate) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderKpiDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiData.map(member => (
          <div key={member.name} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <User className="h-6 w-6 text-indigo-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {Object.keys(member).filter(key => key !== 'name').map(kpiKey => (
                <div key={kpiKey} className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium capitalize flex items-center">
                    {kpiKey.replace(/([A-Z])/g, ' $1')}
                    <div className="ml-2">{getTrendIcon(member, kpiKey)}</div>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      (Target: {kpiKey === 'applicationScreening' ? `<${kpiTargets[kpiKey] + 1}` : kpiTargets[kpiKey]})
                    </span>
                    <input
                      type="number"
                      value={member[kpiKey]}
                      onChange={(e) => handleKpiInputChange(e, member.name, kpiKey)}
                      onBlur={updateKpiInFirestore}
                      className="w-16 px-2 py-1 text-center border-2 border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                    />
                    <div className={`w-3 h-3 rounded-full ${getKPIStatus(kpiKey, member[kpiKey])}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">Leaderboard</h2>
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-lg mx-auto">
          <ul className="space-y-4">
            {[...kpiData].sort((a, b) => calculateScore(b) - calculateScore(a)).map((member, index) => (
              <li key={member.name} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${index < 3 ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-50'}`}>
                <div className="flex items-center">
                  <span className={`font-extrabold text-xl mr-4 ${index === 0 ? 'text-indigo-600' : index === 1 ? 'text-indigo-500' : index === 2 ? 'text-indigo-400' : 'text-gray-400'}`}>#{index + 1}</span>
                  <span className="font-semibold text-gray-700">{member.name}</span>
                </div>
                <div className="flex items-center">
                  {index < 3 && <Award className={`w-5 h-5 mr-2 ${index === 0 ? 'text-yellow-500' : 'text-gray-400'} fill-current`} />}
                  <span className="text-xl font-bold text-gray-900">
                    {calculateScore(member).toFixed(0)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );

  const renderNewStartersDashboard = () => (
    <div className="space-y-6">
      <p className="text-center text-sm text-gray-500 mb-6">Note: This is a **monthly** dashboard. Fallouts are defined as staff leaving within **30 days** of their commencement date.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {newStartersData.map(member => (
          <div key={member.name} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex items-center mb-4">
              <User className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center">
                  <User className="w-5 h-5 mr-2 text-green-500" /> New Starters
                </span>
                <input
                  type="number"
                  value={member.newStarters}
                  onChange={(e) => handleNewStartersInputChange(e, member.name, 'newStarters')}
                  onBlur={updateNewStartersInFirestore}
                  className="w-20 px-2 py-1 text-center border-2 border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center">
                  <UserX className="w-5 h-5 mr-2 text-red-500" /> Fall Outs
                </span>
                <input
                  type="number"
                  value={member.fallOuts}
                  onChange={(e) => handleNewStartersInputChange(e, member.name, 'fallOuts')}
                  onBlur={updateNewStartersInFirestore}
                  className="w-20 px-2 py-1 text-center border-2 border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
                />
              </div>
              <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                <span className="font-bold text-gray-800">Fall Out Rate</span>
                <span className={`text-xl font-bold ${getRateColor(calculateFalloutRate(member.newStarters, member.fallOuts))}`}>
                  {calculateFalloutRate(member.newStarters, member.fallOuts).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-[Inter] text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-2">MPloyHR Recruitment Dashboard</h1>
        
        {userId && (
          <div className="mb-6 text-center text-sm text-gray-500">
            Current User ID: <span className="font-mono text-gray-700">{userId}</span>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <button
            className={`px-6 py-2 rounded-l-full font-semibold transition-colors duration-300 ${activeTab === 'kpis' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('kpis')}
          >
            Weekly KPI Dashboard
          </button>
          <button
            className={`px-6 py-2 rounded-r-full font-semibold transition-colors duration-300 ${activeTab === 'new-starters' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('new-starters')}
          >
            New Starters Dashboard
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="ml-4 text-lg">Loading dashboard data...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-6 bg-red-100 text-red-700 border-l-4 border-red-500 rounded-md shadow-md">
            <h4 className="font-bold">Error</h4>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="fade-in">
            {activeTab === 'kpis' && renderKpiDashboard()}
            {activeTab === 'new-starters' && renderNewStartersDashboard()}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
