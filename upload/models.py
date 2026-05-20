from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    mood_entries = db.relationship('MoodEntry', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

class MoodEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    mood_score = db.Column(db.Integer, nullable=False)
    mood_label = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    sleep_hours = db.Column(db.Float, nullable=True)
    activity_level = db.Column(db.Integer, nullable=True)
    stress_level = db.Column(db.Integer, nullable=True)
    
    # НОВЫЕ ПОЛЯ
    good_thing = db.Column(db.Text, nullable=True)
    bad_thing = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<MoodEntry {self.date}: {self.mood_label}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'mood_score': self.mood_score,
            'mood_label': self.mood_label,
            'notes': self.notes,
            'sleep_hours': self.sleep_hours,
            'activity_level': self.activity_level,
            'stress_level': self.stress_level,
            'good_thing': self.good_thing,
            'bad_thing': self.bad_thing
        }