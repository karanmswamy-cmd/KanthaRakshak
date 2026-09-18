from app.schemas.patient import derive_age_group

def test_pediatric_age():
    assert derive_age_group(12) == "<18"
    assert derive_age_group(17) == "<18"

def test_young_adult_age():
    assert derive_age_group(18) == "18–39"
    assert derive_age_group(25) == "18–39"
    assert derive_age_group(39) == "18–39"

def test_middle_age():
    assert derive_age_group(40) == "40–59"
    assert derive_age_group(55) == "40–59"
    assert derive_age_group(59) == "40–59"

def test_older_adult_age():
    assert derive_age_group(60) == "60–75"
    assert derive_age_group(70) == "60–75"
    assert derive_age_group(75) == "60–75"

def test_geriatric_age():
    assert derive_age_group(76) == "76+"
    assert derive_age_group(88) == "76+"
    assert derive_age_group(102) == "76+"
