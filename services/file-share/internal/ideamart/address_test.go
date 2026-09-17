package ideamart

import "testing"

func TestToTelAddress(t *testing.T) {
	got, err := ToTelAddress("0771234567")
	if err != nil || got != "tel:94771234567" {
		t.Fatalf("got %q err=%v", got, err)
	}
	got, err = ToTelAddress("tel:94771234567")
	if err != nil || got != "tel:94771234567" {
		t.Fatalf("prefixed: %q err=%v", got, err)
	}
}

func TestMaskAddress(t *testing.T) {
	if MaskAddress("tel:94771234567") != "tel:947*****567" {
		t.Fatalf("mask: %s", MaskAddress("tel:94771234567"))
	}
}
