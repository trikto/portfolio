package billing

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const (
	StatusPending = "PENDING"
	StatusCharged = "CHARGED"
	StatusFailed  = "FAILED"
	StatusFunds   = "FAILED_FUNDS"
	StatusUnknown = "UNKNOWN"
	StatusReject  = "REJECTED"
)

type Charge struct {
	ExternalTrxID string    `json:"externalTrxId"`
	InternalTrxID string    `json:"internalTrxId,omitempty"`
	Subscriber    string    `json:"subscriber"`
	Amount        string    `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	Grant         string    `json:"grant"`
	GrantUsed     bool      `json:"grantUsed"`
	FileID        string    `json:"fileId,omitempty"`
	Consent       string    `json:"consent"`
	CreatedAt     time.Time `json:"createdAt"`
}

type Ledger struct {
	dir string
	mu  sync.Mutex
}

func NewLedger(dataDir string) (*Ledger, error) {
	dir := filepath.Join(dataDir, "billing")
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	return &Ledger{dir: dir}, nil
}

func (l *Ledger) Put(charge Charge) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.write(charge)
}

func (l *Ledger) Get(externalTrxID string) (Charge, bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.read(externalTrxID)
}

func (l *Ledger) GetByGrant(grant string) (Charge, bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.readGrant(grant)
}

func (l *Ledger) UpdateStatus(externalTrxID, status, internalTrxID string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	charge, ok, err := l.read(externalTrxID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("charge not found")
	}
	if charge.Status == StatusCharged {
		return nil
	}
	charge.Status = status
	if internalTrxID != "" {
		charge.InternalTrxID = internalTrxID
	}
	return l.write(charge)
}

func (l *Ledger) ConsumeGrant(grant, fileID string) (Charge, bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	charge, ok, err := l.readGrant(grant)
	if err != nil || !ok {
		return Charge{}, false, err
	}
	if charge.Status != StatusCharged || charge.GrantUsed {
		return Charge{}, false, nil
	}
	charge.GrantUsed = true
	charge.FileID = fileID
	if err := l.write(charge); err != nil {
		return Charge{}, false, err
	}
	return charge, true, nil
}

func (l *Ledger) ReleaseGrant(grant string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	charge, ok, err := l.readGrant(grant)
	if err != nil || !ok {
		return err
	}
	charge.GrantUsed = false
	charge.FileID = ""
	return l.write(charge)
}

func (l *Ledger) chargePath(id string) string {
	return filepath.Join(l.dir, "c-"+id+".json")
}

func (l *Ledger) grantPath(grant string) string {
	return filepath.Join(l.dir, "g-"+grant+".json")
}

func (l *Ledger) write(charge Charge) error {
	body, err := json.Marshal(charge)
	if err != nil {
		return err
	}
	if err := os.WriteFile(l.chargePath(charge.ExternalTrxID), body, 0o640); err != nil {
		return err
	}
	return os.WriteFile(l.grantPath(charge.Grant), []byte(charge.ExternalTrxID), 0o640)
}

func (l *Ledger) read(externalTrxID string) (Charge, bool, error) {
	body, err := os.ReadFile(l.chargePath(externalTrxID))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Charge{}, false, nil
		}
		return Charge{}, false, err
	}
	var charge Charge
	if err := json.Unmarshal(body, &charge); err != nil {
		return Charge{}, false, err
	}
	return charge, true, nil
}

func (l *Ledger) readGrant(grant string) (Charge, bool, error) {
	id, err := os.ReadFile(l.grantPath(grant))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Charge{}, false, nil
		}
		return Charge{}, false, err
	}
	return l.read(string(id))
}
