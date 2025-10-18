// backup.js - Simple data backup system
class DataBackup {
    static exportUserData() {
        const users = JSON.parse(localStorage.getItem('semart-users') || '[]');
        const currentUser = auth?.getCurrentUser();
        
        const dataStr = JSON.stringify({
            exportDate: new Date().toISOString(),
            users: users,
            currentUser: currentUser
        }, null, 2);
        
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `semart-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    static importUserData(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.users && Array.isArray(data.users)) {
                    localStorage.setItem('semart-users', JSON.stringify(data.users));
                    alert('Data berhasil diimpor! Silakan refresh halaman.');
                }
            } catch (error) {
                alert('Error mengimpor data: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
}