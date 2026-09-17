package ideamart

import "testing"

func TestToTelAddress(t *testing.T) {
	got, err := ToTelAddress("0771234567")
	if err != nil || got != "tel:94771234567" {
		t.Fatalf("got %q err=%v", got, err)
	}
	got, err = ToTelAddress("0741469028")
	if err != nil || got != "tel:94741469028" {
		t.Fatalf("local 074: %q err=%v", got, err)
	}
	got, err = ToTelAddress("tel:94771234567")
	if err != nil || got != "tel:94771234567" {
		t.Fatalf("prefixed: %q err=%v", got, err)
	}
	if _, err := ToTelAddress("12345"); err == nil {
		t.Fatal("short numbers must be rejected")
	}
	got, err = ToCaasSubscriberID("0776351232")
	if err != nil || got != "94776351232" {
		t.Fatalf("caas: %q err=%v", got, err)
	}
}

func TestMaskAddress(t *testing.T) {
	if MaskAddress("tel:94771234567") != "tel:947*****567" {
		t.Fatalf("mask: %s", MaskAddress("tel:94771234567"))
	}
}
