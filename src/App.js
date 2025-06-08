import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, doc, addDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactMarkdown from 'react-markdown';
// Note: remarkGfm and XLSX are now loaded dynamically inside their respective components
// to avoid build-time resolution issues in this environment.

// --- ICONS (Heroicons & Custom) ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2h2a2 2 0 002 2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-15h.01M17 3h.01M17 17h.01M19 5h.01M19 17h.01M12 9a3 3 0 100-6 3 3 0 000 6z" /></svg>;
const RepeatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

const GoalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
       <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
       <circle cx="12" cy="12" r="9" stroke="#a855f7"></circle>
       <circle cx="12" cy="12" r="5" stroke="#ec4899"></circle>
       <circle cx="12" cy="12" r="1" fill="#f43f5e" stroke="none"></circle>
    </svg>
);

const ParkingLotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="#2dd4bf" />
        <path d="M4 13h3l3 3h4l3 -3h3" stroke="#14b8a6" />
    </svg>
);


// --- DATE HELPERS (date-fns) ---
import { startOfWeek, endOfWeek, addDays, format, eachDayOfInterval, isSameDay, parseISO, addWeeks, subWeeks, isBefore, startOfToday, startOfMonth, endOfMonth, eachWeekOfInterval, getYear, setYear, getMonth, setMonth, addMonths, subMonths, isToday, startOfYear } from 'date-fns';

const ItemTypes = {
  TASK: 'task',
};

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyBm3XTkUXEMkan_L5fQCdtdMJdjujBqsEo",
  authDomain: "my-planner-app-b7ef0.firebaseapp.com",
  projectId: "my-planner-app-b7ef0",
  storageBucket: "my-planner-app-b7ef0.firebasestorage.app",
  messagingSenderId: "595505503069",
  appId: "1:595505503069:web:7c23b3ece54c8272cc26b4",
  measurementId: "G-H63KXHF1WR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// --- AUTHENTICATION CONTEXT ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication error:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        initializeAuth();
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- DATA CONTEXT ---
const DataContext = createContext();

const DataProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [goals, setGoals] = useState([]);
    const [weeklySummaries, setWeeklySummaries] = useState({});
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const getCollectionPath = (collectionName) => {
        const userId = user?.uid || 'anonymous';
        return `/artifacts/${appId}/users/${userId}/${collectionName}`;
    };

    useEffect(() => {
        if (!user) return;

        const tasksCollectionPath = getCollectionPath('tasks');
        const qTasks = query(collection(db, tasksCollectionPath));
        const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(tasksData);
        });

        const goalsCollectionPath = getCollectionPath('goals');
        const qGoals = query(collection(db, goalsCollectionPath));
        const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGoals(goalsData);
        });

        const weeklySummariesCollectionPath = getCollectionPath('weeklySummaries');
        const unsubscribeSummaries = onSnapshot(query(collection(db, weeklySummariesCollectionPath)), (snapshot) => {
            const summaries = {};
            snapshot.forEach(doc => {
                summaries[doc.id] = doc.data();
            });
            setWeeklySummaries(summaries);
        });
        
        return () => {
            unsubscribeTasks();
            unsubscribeGoals();
            unsubscribeSummaries();
        };
    }, [user, appId]);
    
    // --- TASK OPERATIONS ---
    const addTask = async (taskData) => {
      if (!user) return;
        const tasksCollectionPath = getCollectionPath('tasks');
        if (taskData.recurring) {
            await addRecurringTasks(taskData);
        } else {
            await addDoc(collection(db, tasksCollectionPath), { ...taskData, description: taskData.description || '', dueDate: taskData.dueDate ? taskData.dueDate.toISOString() : null });
        }
    };
    
    const updateTask = async (taskId, updatedData) => {
        if (!user) return;
        const taskDocPath = doc(db, getCollectionPath('tasks'), taskId);
        
        const dataToUpdate = { ...updatedData };
        
        if(dataToUpdate.hasOwnProperty('dueDate')){
             if (dataToUpdate.dueDate instanceof Date) {
                dataToUpdate.dueDate = dataToUpdate.dueDate.toISOString();
            } else if (typeof dataToUpdate.dueDate === 'string' && dataToUpdate.dueDate) {
                // assume it's already in a valid format like 'yyyy-MM-dd' from an input[type=date]
                try {
                    dataToUpdate.dueDate = parseISO(dataToUpdate.dueDate).toISOString();
                } catch(e) {
                    console.error("Error parsing date on update: ", dataToUpdate.dueDate);
                    delete dataToUpdate.dueDate; // Don't update with invalid date
                }
            } else {
                 // if it's null or undefined
                 dataToUpdate.dueDate = null;
            }
        }
        
        await setDoc(taskDocPath, dataToUpdate, { merge: true });
    };

    const deleteTask = async (taskId) => {
        if (!user) return;
        const taskDocPath = doc(db, getCollectionPath('tasks'), taskId);
        await deleteDoc(taskDocPath);
    };

    const deleteTaskSeries = async (seriesId) => {
        if (!user) return;
        const tasksCollectionPath = getCollectionPath('tasks');
        const q = query(collection(db, tasksCollectionPath), where("seriesId", "==", seriesId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    };


    const addRecurringTasks = async (taskData) => {
        if (!user) return;
        const { title, recurring, estimatedTime, startDate } = taskData;
        const { endDate } = recurring;

        if (!startDate || !endDate) {
            console.error("Start date or end date is missing for recurring task.");
            return;
        }

        const seriesId = `series-${Date.now()}`;
        const batch = writeBatch(db);
        const tasksCollectionPath = getCollectionPath('tasks');

        let current;
        try {
           current = parseISO(startDate);
        } catch(e) {
            console.error("Invalid start date for recurring task: ", startDate);
            return;
        }

        const end = parseISO(endDate);

        while (current <= end) {
            const newTask = {
                title,
                estimatedTime,
                actualTime: 0,
                completed: false,
                description: '',
                dueDate: current.toISOString(),
                isHabit: true,
                seriesId,
                recurring: true, 
            };
            const newDocRef = doc(collection(db, tasksCollectionPath));
            batch.set(newDocRef, newTask);

            switch (recurring.frequency) {
                case 'daily':
                    current = addDays(current, 1);
                    break;
                case 'weekly':
                    current = addDays(current, 7);
                    break;
                case 'monthly':
                    current = addMonths(current, 1);
                    break;
                default:
                    return;
            }
        }
        await batch.commit();
    };

    const rolloverIncompleteTasks = useCallback(async () => {
        if (!user) return;
        const today = startOfToday();
        const batch = writeBatch(db);
        const tasksToRollover = tasks.filter(task => 
            !task.completed && 
            !task.isHabit && // *** Exclude habits from rollover ***
            task.dueDate && 
            isBefore(parseISO(task.dueDate), today)
        );

        tasksToRollover.forEach(task => {
            const taskDocRef = doc(db, getCollectionPath('tasks'), task.id);
            batch.update(taskDocRef, { dueDate: today.toISOString() });
        });
        
        if (tasksToRollover.length > 0) {
            await batch.commit();
        }
    }, [tasks, user]);
    
    useEffect(() => {
        rolloverIncompleteTasks();
        const interval = setInterval(rolloverIncompleteTasks, 3600000); // Check every hour
        return () => clearInterval(interval);
    }, [rolloverIncompleteTasks]);


    // --- GOAL OPERATIONS ---
    const addGoal = async (goalData) => {
        if (!user) return;
        const goalsCollectionPath = getCollectionPath('goals');
        await addDoc(collection(db, goalsCollectionPath), goalData);
    };

    const updateGoal = async (goalId, updatedData) => {
        if (!user) return;
        const goalDocPath = doc(db, getCollectionPath('goals'), goalId);
        await setDoc(goalDocPath, updatedData, { merge: true });
    };

    const deleteGoal = async (goalId) => {
        if (!user) return;
        const goalDocPath = doc(db, getCollectionPath('goals'), goalId);
        await deleteDoc(goalDocPath);
    };
    
    // --- WEEKLY SUMMARY OPERATIONS ---
    const updateWeeklySummary = async (weekStartDate, summaryData) => {
        if (!user) return;
        const weeklySummaryDocPath = doc(db, getCollectionPath('weeklySummaries'), weekStartDate);
        await setDoc(weeklySummaryDocPath, summaryData, { merge: true });
    };

    const updateHabitSeries = async (seriesId, updates) => {
        const tasksCollectionPath = getCollectionPath('tasks');
        const q = query(collection(db, tasksCollectionPath), where("seriesId", "==", seriesId), where("completed", "==", false));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, updates);
        });
        await batch.commit();
    };
    
    return (
        <DataContext.Provider value={{
            tasks, addTask, updateTask, deleteTask, deleteTaskSeries, updateHabitSeries,
            goals, addGoal, updateGoal, deleteGoal,
            weeklySummaries, updateWeeklySummary
        }}>
            {children}
        </DataContext.Provider>
    );
};


// --- COMPONENTS ---

const TaskDetailModal = ({ task, onClose }) => {
    const { updateTask, deleteTask, deleteTaskSeries } = useContext(DataContext);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState({...task, dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : ''});
    const [showConfirm, setShowConfirm] = useState({ show: false, type: null });

    const handleSave = () => {
        updateTask(task.id, {...editedTask, dueDate: editedTask.dueDate ? parseISO(editedTask.dueDate) : null});
        setIsEditing(false);
    };
    
    const confirmDelete = (type) => {
        setShowConfirm({ show: false, type: null });
        if(type === 'task') {
            deleteTask(task.id);
            onClose();
        } else if(type === 'series') {
            deleteTaskSeries(task.seriesId);
            onClose();
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedTask(prev => ({...prev, [name]: value}));
    }

    const ConfirmationDialog = () => (
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex justify-center items-center rounded-2xl">
            <div className="p-6 bg-white rounded-xl shadow-2xl border text-center">
                <p className="font-semibold mb-4">Are you sure?</p>
                <div className="flex space-x-2">
                    <button onClick={() => setShowConfirm({show: false, type: null})} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={() => confirmDelete(showConfirm.type)} className="py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg relative">
                {showConfirm.show && <ConfirmationDialog />}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">&times;</button>
                {isEditing ? (
                    <div className="space-y-4">
                        <input type="text" name="title" value={editedTask.title} onChange={handleChange} className="w-full text-2xl font-bold p-2 border rounded-lg" />
                        <textarea name="description" value={editedTask.description} onChange={handleChange} placeholder="Add description, links, or notes..." className="w-full p-2 border rounded-lg h-32"></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Due Date</label>
                                <input type="date" name="dueDate" value={editedTask.dueDate} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Estimated Time (min)</label>
                                <input type="number" name="estimatedTime" value={editedTask.estimatedTime} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Actual Time (min)</label>
                                <input type="number" name="actualTime" value={editedTask.actualTime || 0} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                             <button onClick={() => setIsEditing(false)} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                             <button onClick={handleSave} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Save Changes</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <h2 className="text-2xl font-bold text-gray-800">{task.title}</h2>
                         <p className="text-gray-600 whitespace-pre-wrap min-h-[50px]">{task.description || "No description provided."}</p>
                         <div className="flex space-x-8 text-sm">
                             <p><strong>Due:</strong> {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'N/A'}</p>
                             <p><strong>Est. Time:</strong> {task.estimatedTime} min</p>
                             <p><strong>Actual Time:</strong> {task.actualTime || 0} min</p>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t">
                            <div>
                                <button onClick={() => setIsEditing(true)} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Edit Task</button>
                            </div>
                            <div className="flex space-x-2">
                               {task.recurring && <button onClick={() => setShowConfirm({ show: true, type: 'series' })} className="py-2 px-4 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200">Delete Series</button>}
                               <button onClick={() => setShowConfirm({ show: true, type: 'task' })} className="py-2 px-4 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200">Delete Task</button>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const HabitManagerModal = ({ seriesId, onClose }) => {
    const { tasks, updateHabitSeries, addRecurringTasks } = useContext(DataContext);
    const [newEndDate, setNewEndDate] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const handleExtend = async () => {
        if (!newEndDate) return;
        
        const seriesTasks = tasks.filter(t => t.seriesId === seriesId);
        if (seriesTasks.length === 0) return;

        const lastTask = seriesTasks.sort((a,b) => parseISO(b.dueDate) - parseISO(a.dueDate))[0];
        
        const newRecurringTask = {
            ...lastTask,
            recurring: { ...lastTask.recurring, endDate: newEndDate },
            startDate: format(addDays(parseISO(lastTask.dueDate), 1), 'yyyy-MM-dd')
        };
        await addRecurringTasks(newRecurringTask);
        onClose();
    };

    const handlePush = async () => {
        if(!newStartDate) return;
        // This is a simplified push. A more robust implementation would handle complex frequency logic.
        alert("Pushing start dates is a complex operation and has been simplified for this demo.");
        onClose();
    };

    const handleUpdateDescription = async () => {
        if(!newDescription) return;
        await updateHabitSeries(seriesId, { description: newDescription });
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Manage Habit Series</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Extend End Date</label>
                        <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                        <button onClick={handleExtend} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg">Extend</button>
                    </div>
                    <div className="opacity-50 cursor-not-allowed">
                        <label className="block text-sm font-medium text-gray-700">Push Back Start Date (from first incomplete)</label>
                        <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full p-2 border rounded-lg" disabled />
                        <button onClick={handlePush} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg" disabled>Push</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Update Description for Future Habits</label>
                        <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full p-2 border rounded-lg h-24"></textarea>
                        <button onClick={handleUpdateDescription} className="mt-2 w-full py-2 px-4 bg-teal-600 text-white rounded-lg">Update Description</button>
                    </div>
                </div>
                 <div className="flex justify-end pt-4 mt-4 border-t">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Close</button>
                 </div>
            </div>
        </div>
    )
}

const Task = ({ task }) => {
    const { updateTask } = useContext(DataContext);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showHabitManager, setShowHabitManager] = useState(false);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { id: task.id, dueDate: task.dueDate },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const handleToggleComplete = (e) => {
        e.stopPropagation();
        updateTask(task.id, { completed: !task.completed });
    };
    
    return (
        <>
            <div ref={drag} onClick={() => setShowDetailModal(true)} className={`group relative p-2.5 rounded-lg shadow-sm mb-2 transition-all duration-200 border-l-4 cursor-pointer ${task.completed ? 'bg-green-100 text-gray-500 line-through border-green-400' : 'bg-white hover:bg-gray-50'} ${task.isHabit ? 'border-violet-400' : 'border-orange-400'} ${isDragging ? 'opacity-50 scale-105 shadow-lg' : 'opacity-100'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center flex-grow min-w-0">
                        <input type="checkbox" checked={task.completed} onChange={handleToggleComplete} onClick={(e) => e.stopPropagation()} className={`h-5 w-5 rounded-full border-gray-300 focus:ring-0 focus:ring-offset-0 transition-all ${task.isHabit ? 'text-violet-500' : 'text-orange-500'}`} />
                        <span className="ml-3 font-medium text-gray-800 truncate">{task.title}</span>
                    </div>
                    {task.isHabit && (
                        <button onClick={(e) => {e.stopPropagation(); setShowHabitManager(true)}} className="opacity-0 group-hover:opacity-100 text-xs text-violet-600 font-semibold mr-2">Manage</button>
                    )}
                    {task.estimatedTime && <span className="ml-2 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{task.estimatedTime}m</span>}
                </div>
            </div>
            {showDetailModal && <TaskDetailModal task={task} onClose={() => setShowDetailModal(false)} />}
            {showHabitManager && <HabitManagerModal seriesId={task.seriesId} onClose={() => setShowHabitManager(false)} />}
        </>
    );
};

const DayColumn = ({ day, tasks }) => {
    const { updateTask } = useContext(DataContext);

    const regularTasks = tasks.filter(t => !t.isHabit);
    const habits = tasks.filter(t => t.isHabit);

    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: (item) => {
            updateTask(item.id, { dueDate: day });
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));
    
    return (
        <div ref={drop} className={`flex-1 p-3 bg-white rounded-xl min-h-[400px] transition-colors ${isOver ? 'bg-teal-100' : ''}`}>
            <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-500">{format(day, 'EEE')}</h3>
                <p className={`font-bold text-2xl ${isToday(day) ? 'text-teal-600' : 'text-gray-800'}`}>{format(day, 'd')}</p>
            </div>
            <div className="space-y-2">
                 {regularTasks.map(task => <Task key={task.id} task={task}/>)}
            </div>

            {habits.length > 0 && (
                <>
                    <div className="my-4 relative text-center">
                        <hr className="border-dashed border-gray-300"/>
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500 font-medium tracking-wider uppercase">Habits</span>
                    </div>
                    <div className="space-y-2">
                         {habits.map(habit => <Task key={habit.id} task={habit}/>)}
                    </div>
                </>
            )}
        </div>
    );
};


const CalendarView = ({ currentDate }) => {
    const { tasks } = useContext(DataContext);
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState(null);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const handleAddTaskClick = (date) => {
        setModalDate(date);
        setShowModal(true);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
                <div className="flex space-x-4">
                    {weekDays.map(day => (
                        <div key={day.toString()} className="flex-1">
                           <DayColumn 
                                day={day} 
                                tasks={tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day))}
                            />
                            <button onClick={() => handleAddTaskClick(day)} className="mt-2 w-full flex items-center justify-center p-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">
                                <PlusIcon />
                            </button>
                        </div>
                    ))}
                </div>
                <MealPlanner currentWeek={currentDate} />
            </div>
            <div className="xl:col-span-1 space-y-6">
                <AISummary timeframe="week" startDate={weekStart} endDate={weekEnd} />
                <WeeklyNotes currentWeek={currentDate} />
            </div>
             {showModal && <CreateTaskModal date={modalDate} onClose={() => setShowModal(false)} />}
        </div>
    );
};

const CreateTaskModal = ({ onClose, date, initialData }) => {
    const { addTask } = useContext(DataContext);
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [estimatedTime, setEstimatedTime] = useState(initialData?.estimatedTime || 30);
    const [isHabit, setIsHabit] = useState(false);
    const [dueDate, setDueDate] = useState(initialData?.dueDate || (date ? format(date, 'yyyy-MM-dd') : ''));
    const [recurringOptions, setRecurringOptions] = useState({
        frequency: 'daily',
        endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    });
    
    useEffect(() => {
        if(initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setEstimatedTime(initialData.estimatedTime || 30);
            setDueDate(initialData.dueDate || '');
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const taskData = {
            title,
            description,
            estimatedTime,
            actualTime: 0,
            completed: false,
            dueDate: dueDate ? parseISO(dueDate) : null,
            isHabit,
            recurring: isHabit ? recurringOptions : null,
            startDate: dueDate ? dueDate : format(new Date(), 'yyyy-MM-dd'),
        };
        addTask(taskData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Create a New Item</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-24" placeholder="(Optional) Add notes, links..."></textarea>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Time (minutes)</label>
                        <input type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <input type="checkbox" checked={isHabit} onChange={(e) => setIsHabit(e.target.checked)} className="h-5 w-5 rounded text-violet-600 border-gray-300 focus:ring-violet-500" />
                            <span className="ml-3 font-medium text-gray-700">This is a recurring habit</span>
                        </label>
                    </div>
                    {isHabit && (
                        <div className="p-4 bg-gray-100 rounded-lg space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Frequency</label>
                                <select value={recurringOptions.frequency} onChange={(e) => setRecurringOptions({...recurringOptions, frequency: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                                <input type="date" value={recurringOptions.endDate} onChange={(e) => setRecurringOptions({...recurringOptions, endDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TaskList = () => {
    const { tasks } = useContext(DataContext);
    
    const completedTasks = tasks
        .filter(t => t.completed)
        .sort((a,b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return parseISO(b.dueDate) - parseISO(a.dueDate);
        });
        
    const scheduledTasks = tasks
        .filter(t => !t.completed && t.dueDate)
        .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        
    const parkingLotTasks = tasks.filter(t => !t.completed && !t.dueDate);

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">All Tasks</h2>
            <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-700">Scheduled Tasks</h3>
                <div className="space-y-2">
                    {scheduledTasks.length > 0 ? (
                        scheduledTasks.map(task => <Task key={task.id} task={task}/>)
                    ) : (
                         <p className="text-sm text-gray-400">No scheduled tasks.</p>
                    )}
                </div>
            </div>
            <div className="mt-8">
                <h3 className="font-semibold text-lg mb-3 text-gray-700 flex items-center"><ParkingLotIcon /> Parking Lot</h3>
                 <p className="text-sm text-gray-500 mb-4">Tasks without a due date. Drag them to the calendar to schedule.</p>
                <div className="space-y-2">
                    {parkingLotTasks.length > 0 ? (
                        parkingLotTasks.map(task => <Task key={task.id} task={task}/>)
                    ) : (
                        <p className="text-sm text-gray-400">Your parking lot is empty!</p>
                    )}
                </div>
            </div>
             <div className="mt-8 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-lg mb-3 text-gray-500">Completed Tasks</h3>
                 <div className="space-y-2">
                    {completedTasks.length > 0 ? (
                        completedTasks.map(task => <Task key={task.id} task={task}/>)
                     ) : (
                         <p className="text-sm text-gray-400">No tasks completed yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const GoalBreakdownModal = ({ goalText, tasks, onClose, onAddTasks }) => {
    const [selectedTasks, setSelectedTasks] = useState([]);

    const handleToggleTask = (taskText) => {
        setSelectedTasks(prev => 
            prev.includes(taskText) ? prev.filter(t => t !== taskText) : [...prev, taskText]
        );
    };

    const handleAdd = () => {
        onAddTasks(selectedTasks);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Suggested Tasks</h2>
                <p className="text-gray-600 mb-4">For your goal: "{goalText}"</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {tasks.map((task, index) => (
                        <label key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                            <input type="checkbox" onChange={() => handleToggleTask(task)} className="h-5 w-5 rounded text-teal-600 border-gray-300 focus:ring-teal-500" />
                            <span className="ml-3 font-medium text-gray-700">{task}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleAdd} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-teal-300" disabled={selectedTasks.length === 0}>Add Selected Tasks</button>
                </div>
            </div>
        </div>
    );
};

const GoalsView = () => {
    const { goals, addGoal, updateGoal, deleteGoal, addTask } = useContext(DataContext);
    const [newGoal, setNewGoal] = useState('');
    const [loadingBreakdown, setLoadingBreakdown] = useState(null);
    const [breakdownModal, setBreakdownModal] = useState({ show: false, goalText: '', tasks: [] });

    const handleAddGoal = () => {
        if (newGoal.trim() === '') return;
        addGoal({ text: newGoal, completed: false });
        setNewGoal('');
    };

    const breakDownGoal = async (goal) => {
        setLoadingBreakdown(goal.id);
        const prompt = `Break down the following high-level goal into a short list of small, actionable tasks. Return the tasks as a JSON object with a single key "tasks" which is an array of strings.\n\nGoal: "${goal.text}"`;
        
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { 
                contents: chatHistory,
                generationConfig: { responseMimeType: "application/json" }
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const parsed = JSON.parse(result.candidates[0].content.parts[0].text);
                setBreakdownModal({ show: true, goalText: goal.text, tasks: parsed.tasks || [] });
            } else {
                console.error("Goal Breakdown Error: Invalid response structure", result);
                alert("Sorry, I couldn't break down that goal.");
            }
        } catch(error) {
            console.error("Goal Breakdown Error:", error);
            alert("An error occurred while breaking down the goal.");
        } finally {
            setLoadingBreakdown(null);
        }
    };

    const addBrokenDownTasks = (tasksToAdd) => {
        tasksToAdd.forEach(taskTitle => {
            addTask({
                title: taskTitle,
                estimatedTime: 30, // Default time
                actualTime: 0,
                completed: false,
                dueDate: null, // Add to parking lot
                isHabit: false,
            });
        });
    };

    return (
        <>
            <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center"><GoalIcon /> Medium & Long-Term Goals</h2>
                <div className="flex mb-6">
                    <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Add a new goal..." className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"/>
                    <button onClick={handleAddGoal} className="bg-teal-600 text-white py-3 px-5 rounded-r-lg hover:bg-teal-700 font-semibold transition-colors">Add</button>
                </div>
                <div className="space-y-3">
                    {goals.map(goal => (
                        <div key={goal.id} className={`flex items-center justify-between p-3 rounded-lg ${goal.completed ? 'bg-gray-100' : 'bg-white border'}`}>
                            <span className={`font-medium ${goal.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>{goal.text}</span>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => breakDownGoal(goal)} disabled={loadingBreakdown === goal.id} className="p-2 rounded-full hover:bg-teal-100 text-teal-600 disabled:text-gray-400 disabled:hover:bg-transparent" title="Break down with AI">
                                     {loadingBreakdown === goal.id ? '...' : <SparklesIcon />}
                                </button>
                                <button onClick={() => updateGoal(goal.id, {completed: !goal.completed})} className="p-2 rounded-full hover:bg-green-100 text-green-600">✓</button>
                                <button onClick={() => deleteGoal(goal.id)} className="p-2 rounded-full hover:bg-red-100 text-red-600">X</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {breakdownModal.show && <GoalBreakdownModal goalText={breakdownModal.goalText} tasks={breakdownModal.tasks} onClose={() => setBreakdownModal({show: false, goalText: '', tasks: []})} onAddTasks={addBrokenDownTasks} />}
        </>
    );
};

const WeeklyNotes = ({ currentWeek }) => {
    const { weeklySummaries, updateWeeklySummary } = useContext(DataContext);

    const weekKey = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weeklyData = weeklySummaries[weekKey] || { notes: '' };
    
    const handleChange = (value) => {
        updateWeeklySummary(weekKey, { ...weeklyData, notes: value });
    }

    return (
         <div className="p-4 sm:p-6 bg-yellow-50 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-yellow-900">Weekly Notes</h2>
             <textarea 
                value={weeklyData.notes} 
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Thoughts, reflections, and important notes for the week..."
                className="w-full p-2 border border-yellow-200 bg-white/50 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 h-48"
            />
        </div>
    )
}

const MealPlanner = ({ currentWeek }) => {
    const { weeklySummaries, updateWeeklySummary } = useContext(DataContext);
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isEditingShoppingList, setIsEditingShoppingList] = useState(true);
    const [gfm, setGfm] = useState(null);

    useEffect(() => {
        import('https://esm.sh/remark-gfm').then(module => {
            setGfm(() => module.default);
        }).catch(err => console.error("Failed to load remark-gfm", err));
    }, []);

    const weekKey = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weeklyData = weeklySummaries[weekKey] || { meals: {}, shoppingList: '' };
    const weekDays = eachDayOfInterval({start: startOfWeek(currentWeek, {weekStartsOn:1}), end: endOfWeek(currentWeek, {weekStartsOn:1})});
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

    const handleMealChange = (day, meal, value) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const updatedMeals = {
            ...weeklyData.meals,
            [dayKey]: {
                ...weeklyData.meals?.[dayKey],
                [meal]: value
            }
        };
        updateWeeklySummary(weekKey, { ...weeklyData, meals: updatedMeals });
    };

     const generateShoppingList = async () => {
        if(!weeklyData.meals) return;
        setIsGeneratingList(true);
        const mealPlanText = Object.entries(weeklyData.meals).map(([day, meals]) => {
            const date = format(parseISO(day), 'EEEE');
            const mealEntries = Object.entries(meals).map(([mealType, meal]) => meal ? `  ${mealType}: ${meal}` : null).filter(Boolean).join('\n');
            return `${date}:\n${mealEntries}`;
        }).join('\n\n');

        const prompt = `Based on the following meal plan, create a simple, categorized shopping list in Markdown format. Categories could be "Produce", "Dairy & Eggs", "Meat & Fish", "Pantry", "Frozen", etc. \n\nMeal Plan:\n${mealPlanText}`;
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                updateWeeklySummary(weekKey, {...weeklyData, shoppingList: result.candidates[0].content.parts[0].text});
                setIsEditingShoppingList(false);
            } else {
                 console.error("Shopping List Error", result);
                 alert("Sorry, could not generate a shopping list.");
            }
        } catch(error) {
              console.error("Shopping List Error", error);
              alert("An error occurred while generating the shopping list.");
        } finally {
            setIsGeneratingList(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Meal Planner</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {mealTypes.map(mealType => (
                         <div key={mealType} className="space-y-2">
                             <h3 className="font-bold text-center text-gray-700">{mealType}</h3>
                            {weekDays.map(day => (
                                <input
                                    key={day.toString()}
                                    type="text"
                                    placeholder={format(day, 'EEE')}
                                    value={weeklyData.meals?.[format(day, 'yyyy-MM-dd')]?.[mealType] || ''}
                                    onChange={(e) => handleMealChange(day, mealType, e.target.value)}
                                    className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                />
                            ))}
                         </div>
                    ))}
                </div>
            </div>
            <div className="p-4 sm:p-6 bg-orange-50 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xl font-bold text-orange-900">Shopping List</h3>
                    <div className="flex items-center space-x-2">
                        <button onClick={generateShoppingList} disabled={isGeneratingList} className="text-xs font-semibold text-orange-700 hover:text-orange-900 disabled:text-gray-400">✨ Generate</button>
                         <button onClick={() => setIsEditingShoppingList(!isEditingShoppingList)} className="text-xs font-semibold text-orange-700 hover:text-orange-900">{isEditingShoppingList ? 'Preview' : 'Edit'}</button>
                    </div>
                </div>
                 {isEditingShoppingList ? (
                     <textarea 
                        value={isGeneratingList ? "Generating..." : weeklyData.shoppingList} 
                        onChange={(e) => updateWeeklySummary(weekKey, {...weeklyData, shoppingList: e.target.value})}
                        placeholder="Your shopping list..."
                        className="w-full p-2 border border-orange-200 bg-white/50 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 h-64"
                    />
                 ) : (
                    <div className="prose prose-sm p-2 rounded-lg bg-white/50 h-64 overflow-y-auto">
                        {gfm ? <ReactMarkdown remarkPlugins={[gfm]}>{weeklyData.shoppingList || "Nothing to show."}</ReactMarkdown> : 'Loading Preview...' }
                    </div>
                 )}
            </div>
        </div>
    )
};

const AISummary = ({ timeframe, startDate, endDate }) => {
    const { tasks } = useContext(DataContext);
    const [summary, setSummary] = useState("");
    const [loading, setLoading] = useState(false);

    const generateSummary = useCallback(async () => {
        setLoading(true);
        setSummary("");

        const completedTasks = tasks.filter(task => 
            task.completed && 
            task.dueDate && 
            (isSameDay(parseISO(task.dueDate), startDate) || (isBefore(startDate, parseISO(task.dueDate)) && isBefore(parseISO(task.dueDate), endDate)))
        );
        
        if (completedTasks.length === 0) {
            setSummary("No completed tasks in this period to summarize.");
            setLoading(false);
            return;
        }

        const taskTitles = completedTasks.map(t => `- ${t.title} (Est: ${t.estimatedTime}m, Actual: ${t.actualTime}m)`).join('\n');
        const prompt = `As a productivity coach, analyze the following list of completed tasks for this ${timeframe} and write an encouraging, insightful summary of accomplishments. Highlight patterns, wins, and areas for reflection. Be brief (2-3 sentences) and motivational.\n\nCompleted Tasks:\n${taskTitles}`;

        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                setSummary(result.candidates[0].content.parts[0].text);
            } else {
                setSummary("Could not generate summary. Please try again.");
                console.error("AI Summary Error: Invalid response structure", result);
            }
        } catch (error) {
            console.error("AI Summary Error:", error);
            setSummary("An error occurred while generating the summary.");
        } finally {
            setLoading(false);
        }
    }, [tasks, timeframe, startDate, endDate]);

    useEffect(() => {
      const timer = setTimeout(() => generateSummary(), 500); // Debounce to prevent rapid firing
      return () => clearTimeout(timer);
    }, [tasks, timeframe, startDate, endDate]);

    return (
        <div className="p-4 sm:p-6 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold mb-3 flex items-center text-teal-900"><SparklesIcon /> AI {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Summary</h3>
            <div className="min-h-[100px]">
                {loading ? (
                     <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                ) : (
                    <p className="text-teal-800 font-medium whitespace-pre-wrap text-sm">{summary}</p>
                )}
            </div>
            <button onClick={generateSummary} disabled={loading} className="mt-4 bg-teal-500 text-white py-2 px-4 rounded-lg hover:bg-teal-600 disabled:bg-teal-300 font-semibold text-sm transition-all flex items-center">
                <RepeatIcon />
                <span className="ml-2">{loading ? "Regenerating..." : "Regenerate"}</span>
            </button>
        </div>
    );
};


const MonthView = ({ currentDate, setCurrentDate, setActiveView }) => {
    const { tasks } = useContext(DataContext);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({start: monthStart, end: monthEnd}, { weekStartsOn: 1 });

    const handleDayClick = (day) => {
        setCurrentDate(day);
        setActiveView('calendar');
    };

    return (
         <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm">
            <AISummary timeframe="month" startDate={monthStart} endDate={monthEnd} />
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500 mt-6 pb-2">
                {eachDayOfInterval({start: weeks[0], end: addDays(weeks[0], 6)}).map(day => <div key={day}>{format(day, 'EEE')}</div>)}
            </div>
             <div className="grid grid-cols-7 gap-1">
                {weeks.map((weekStart, i) => 
                    eachDayOfInterval({start: weekStart, end: endOfWeek(weekStart, {weekStartsOn: 1})}).map(day => {
                        const tasksForDay = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));
                        const isCurrentMonth = getMonth(day) === getMonth(currentDate);
                        return (
                            <div key={day.toString()} onClick={() => handleDayClick(day)} className={`p-2 border border-gray-200 rounded-lg h-28 flex flex-col cursor-pointer transition-colors ${isCurrentMonth ? 'bg-white hover:bg-teal-50' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                <span className={`font-semibold ${isToday(day) ? 'text-teal-600' : ''}`}>{format(day, 'd')}</span>
                                {tasksForDay.length > 0 && <span className="mt-auto text-xs bg-teal-100 text-teal-800 rounded-full px-2 self-start font-medium">{tasksForDay.length} tasks</span>}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

const YearView = ({ currentDate, setCurrentDate, setActiveView }) => {
    const year = getYear(currentDate);
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const handleMonthClick = (month) => {
        setCurrentDate(month);
        setActiveView('month');
    };

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-sm">
            <AISummary timeframe="year" startDate={yearStart} endDate={yearEnd} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                {months.map(month => (
                    <div key={getMonth(month)} onClick={() => handleMonthClick(month)} className="p-4 border border-gray-200 rounded-xl text-center cursor-pointer hover:bg-teal-50 hover:shadow-lg hover:-translate-y-1 transition-all">
                        <h3 className="font-bold text-lg text-gray-700">{format(month, 'MMMM')}</h3>
                    </div>
                ))}
            </div>
        </div>
    )
}

const BatchAddModal = ({ tasks, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
             <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Batch Add</h2>
                <p className="text-gray-600 mb-4">The following tasks will be created. Please review them.</p>
                <div className="space-y-2 max-h-80 overflow-y-auto p-2 bg-gray-50 rounded-lg border">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-2">Title</th>
                                <th className="px-4 py-2">Due Date</th>
                                <th className="px-4 py-2">Est. Time</th>
                                <th className="px-4 py-2">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task, index) => (
                                <tr key={index} className="bg-white border-b">
                                    <td className="px-4 py-2 font-medium text-gray-900">{task.title}</td>
                                    <td className="px-4 py-2">{task.dueDate}</td>
                                    <td className="px-4 py-2">{task.estimatedTime}</td>
                                    <td className="px-4 py-2 truncate max-w-xs">{task.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700">Add All Tasks</button>
                </div>
             </div>
        </div>
    )
}

function App() {
    const { addTask, tasks } = useContext(DataContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState('calendar');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalData, setCreateModalData] = useState(null);
    const [smartAddText, setSmartAddText] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [batchAddModal, setBatchAddModal] = useState({ show: false, tasks: [] });

    
    const handleSmartAdd = async () => {
        if(!smartAddText) return;
        setIsParsing(true);

        // Check for Excel/TSV paste
        if (smartAddText.includes('\t') && smartAddText.includes('\n')) {
            const rows = smartAddText.trim().split('\n');
            const parsedTasks = rows.map(row => {
                const columns = row.split('\t');
                return {
                    title: columns[0] || 'Untitled',
                    dueDate: columns[1] || null,
                    estimatedTime: parseInt(columns[2], 10) || 30,
                    description: columns[3] || '',
                    isHabit: false,
                    completed: false,
                    actualTime: 0
                };
            });
            setBatchAddModal({ show: true, tasks: parsedTasks });
            setIsParsing(false);
            setSmartAddText("");
            return;
        }

        // Fallback to single-line AI parsing
        const prompt = `Parse the following text to create a task. Today's date is ${format(new Date(), 'yyyy-MM-dd')}. Extract the title, a dueDate in 'yyyy-MM-dd' format, an estimatedTime in minutes (as a number), and a description. If a detail is missing, leave its value as null. Respond with a JSON object with keys: "title", "dueDate", "estimatedTime", "description".\n\nText: "${smartAddText}"`;
        try {
            let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = {
                contents: chatHistory,
                generationConfig: { responseMimeType: "application/json" }
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const parsedData = JSON.parse(result.candidates[0].content.parts[0].text);
                setCreateModalData(parsedData);
                setShowCreateModal(true);
                setSmartAddText("");
            } else {
                console.error("Smart Add Error", result);
                alert("Sorry, I couldn't understand that. Please try creating the task manually.");
            }
        } catch(error) {
            console.error("Smart Add Error", error);
            alert("An error occurred while parsing the task.");
        } finally {
            setIsParsing(false);
        }
    };

    const confirmBatchAdd = () => {
        batchAddModal.tasks.forEach(taskData => {
            addTask({
                ...taskData,
                dueDate: taskData.dueDate ? parseISO(taskData.dueDate) : null
            });
        });
        setBatchAddModal({ show: false, tasks: [] });
    };

    const handleExport = async () => {
        let dataToExport = [];
        let filename = 'tasks.xlsx';
        
        try {
            const XLSX = await import('https://esm.sh/xlsx');

            if (activeView === 'calendar') {
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
                dataToExport = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), weekStart) || (isBefore(weekStart, parseISO(t.dueDate)) && isBefore(parseISO(t.dueDate), weekEnd)));
                filename = `tasks_week_${format(weekStart, 'yyyy-MM-dd')}.xlsx`;
            } else if (activeView === 'month') {
                const monthStart = startOfMonth(currentDate);
                dataToExport = tasks.filter(t => t.dueDate && getMonth(parseISO(t.dueDate)) === getMonth(monthStart) && getYear(parseISO(t.dueDate)) === getYear(monthStart));
                filename = `tasks_month_${format(monthStart, 'yyyy-MM')}.xlsx`;
            } else if (activeView === 'year') {
                 const yearStart = startOfYear(currentDate);
                 dataToExport = tasks.filter(t => t.dueDate && getYear(parseISO(t.dueDate)) === getYear(yearStart));
                 filename = `tasks_year_${getYear(yearStart)}.xlsx`;
            } else {
                dataToExport = tasks;
            }

            const formattedData = dataToExport.map(t => ({
                Title: t.title,
                'Due Date': t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : 'N/A',
                Completed: t.completed,
                'Est. Time (min)': t.estimatedTime,
                'Actual Time (min)': t.actualTime,
                Description: t.description,
                Type: t.isHabit ? 'Habit' : 'Task'
            }));

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error("Failed to load or use XLSX for export:", error);
            alert("Could not export to Excel. Please try again.");
        }
    };


    const { user, loading } = useContext(AuthContext);
    
    if (loading) {
        return <div className="min-h-screen bg-sky-50 flex items-center justify-center"><p className="font-semibold text-gray-600">Loading Planner...</p></div>;
    }
    
    const ViewHeader = () => {
        const year = getYear(currentDate);
        let title = "";
        let prev, next;

        switch(activeView){
            case 'calendar':
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                title = `${format(weekStart, 'MMM d')} - ${format(endOfWeek(weekStart, {weekStartsOn:1}), 'MMM d, yyyy')}`;
                prev = () => setCurrentDate(subWeeks(currentDate, 1));
                next = () => setCurrentDate(addWeeks(currentDate, 1));
                break;
            case 'month':
                 title = format(currentDate, 'MMMM yyyy');
                 prev = () => setCurrentDate(subMonths(currentDate, 1));
                 next = () => setCurrentDate(addMonths(currentDate, 1));
                 break;
            case 'year':
                title = year.toString();
                prev = () => setCurrentDate(setYear(currentDate, year - 1));
                next = () => setCurrentDate(setYear(currentDate, year + 1));
                break;
            default:
                title = "Dashboard";
        }

        return (
             <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                 <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                    {activeView !== 'taskList' && activeView !== 'goals' && (
                        <div className="flex items-center">
                             <button onClick={prev} className="p-2 rounded-full text-gray-500 hover:bg-gray-200"><ChevronLeftIcon /></button>
                             <button onClick={next} className="p-2 rounded-full text-gray-500 hover:bg-gray-200"><ChevronRightIcon /></button>
                        </div>
                    )}
                 </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={handleExport} className="flex items-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"><DownloadIcon/> Export</button>
                    <button onClick={() => setCurrentDate(new Date())} className="bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">Today</button>
                    <button onClick={() => { setCreateModalData(null); setShowCreateModal(true); }} className="flex items-center bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-teal-700 transition-colors">
                        <PlusIcon /> <span className="hidden sm:inline ml-2">Create</span>
                    </button>
                 </div>
            </div>
        )
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-sky-50 font-sans p-4 sm:p-6 lg:p-8">
                <div className="max-w-screen-2xl mx-auto">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                             <h1 className="text-2xl font-bold text-gray-800">Productivity Planner</h1>
                             <p className="text-gray-500 text-sm">Your User ID: <span className="font-mono bg-gray-200 px-1 py-0.5 rounded text-xs">{user?.uid}</span></p>
                        </div>
                         <div className="bg-white p-1 rounded-lg shadow-sm mt-4 md:mt-0">
                            <div className="flex space-x-1">
                                <button onClick={() => setActiveView('calendar')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'calendar' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Week</button>
                                <button onClick={() => setActiveView('month')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'month' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Month</button>
                                <button onClick={() => setActiveView('year')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'year' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Year</button>
                                <button onClick={() => setActiveView('taskList')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'taskList' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Tasks</button>
                                <button onClick={() => setActiveView('goals')} className={`w-full text-center py-2 px-4 rounded-md font-semibold text-sm transition-colors ${activeView === 'goals' ? 'bg-teal-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Goals</button>
                            </div>
                        </div>
                    </header>

                    <div className="mb-6">
                        <div className="flex rounded-lg shadow-sm">
                            <input type="text" value={smartAddText} onChange={(e) => setSmartAddText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSmartAdd()} placeholder="✨ Smart Add: Try 'Team meeting next Tuesday at 3pm for 45 mins' or paste from Excel..." className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                            <button onClick={handleSmartAdd} disabled={isParsing} className="bg-teal-500 text-white py-3 px-5 rounded-r-lg hover:bg-teal-600 font-semibold transition-colors disabled:bg-teal-300">{isParsing ? '...' : 'Add'}</button>
                        </div>
                    </div>

                    <main>
                        <ViewHeader />
                        {activeView === 'calendar' && <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />}
                        {activeView === 'month' && <MonthView currentDate={currentDate} setCurrentDate={setCurrentDate} setActiveView={setActiveView} />}
                        {activeView === 'year' && <YearView currentDate={currentDate} setCurrentDate={setCurrentDate} setActiveView={setActiveView} />}
                        {activeView === 'taskList' && <TaskList />}
                        {activeView === 'goals' && <GoalsView />}
                    </main>
                    
                    {showCreateModal && <CreateTaskModal onClose={() => setShowCreateModal(false)} date={currentDate} initialData={createModalData}/>}
                    {batchAddModal.show && <BatchAddModal tasks={batchAddModal.tasks} onClose={() => setBatchAddModal({show: false, tasks: []})} onConfirm={confirmBatchAdd} />}
                </div>
            </div>
        </DndProvider>
    );
}

export default function WeeklyPlannerApp() {
    return (
        <AuthProvider>
            <DataProvider>
                <App />
            </DataProvider>
        </AuthProvider>
    );
}
