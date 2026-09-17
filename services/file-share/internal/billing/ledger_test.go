package billing

import "testing"

func TestConsumeGrantOnce(t *testing.T) {
	ledger, err := NewLedger(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	charge := Charge{ExternalTrxID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Grant: "grantgrantgrantgrantgr", Status: StatusCharged, Amount: "1.00", Currency: "LKR"}
	if err := ledger.Put(charge); err != nil {
		t.Fatal(err)
	}
	if _, ok, err := ledger.ConsumeGrant(charge.Grant, "fileidfileidfileidfi"); err != nil || !ok {
		t.Fatalf("first consume ok=%v err=%v", ok, err)
	}
	if _, ok, err := ledger.ConsumeGrant(charge.Grant, "other"); err != nil || ok {
		t.Fatalf("second consume ok=%v err=%v", ok, err)
	}
}
