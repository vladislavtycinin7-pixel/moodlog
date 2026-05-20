import os
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, MoodEntry

# Создаем приложение
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mood_diary.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

@app.after_request
def add_no_cache_headers(response):
    """Запрещаем браузеру кэшировать страницы, чтобы при выходе не показывало старые"""
    if request.path.startswith('/static/'):
        return response
    
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Инициализируем БД
db.init_app(app)

# Настройка Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Пожалуйста, войдите в систему'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Создаем таблицы
with app.app_context():
    db.create_all()
    print("База данных готова!")

# ============= МАРШРУТЫ АВТОРИЗАЦИИ =============

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        # Проверяем, совпадают ли пароли
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Пароли не совпадают!'})
        
        # Проверяем, существует ли пользователь
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Пользователь с таким именем уже существует'})
        
        # Создаем нового пользователя
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        user = User(username=username, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Регистрация успешна! Теперь войдите в систему'})
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            login_user(user)
            return jsonify({'success': True, 'message': f'Добро пожаловать, {username}!'})
        else:
            return jsonify({'success': False, 'message': 'Неверное имя пользователя или пароль'})
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Вы вышли из системы', 'success')
    return redirect(url_for('index'))

# ============= ОСНОВНЫЕ МАРШРУТЫ =============

@app.route('/test')
def test():
    return "Сервер работает! ✅"

@app.route('/')
def index():
    """Главная страница: для авторизованных — записи, для гостей — лендинг"""
    if current_user.is_authenticated:
        # Авторизован — показываем его записи
        entries = MoodEntry.query.filter_by(user_id=current_user.id).order_by(MoodEntry.date.desc()).limit(30).all()
        return render_template('index.html', entries=entries)
    else:
        # Не авторизован — показываем новую приветственную страницу
        return render_template('landing.html')

@app.route('/stats')
@login_required
def stats():
    entries = MoodEntry.query.filter_by(user_id=current_user.id).order_by(MoodEntry.date).all()
    return render_template('stats.html', entries=entries)

@app.route('/add', methods=['GET', 'POST'])
@login_required
def add_entry():
    if request.method == 'POST':
        try:
            date = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
            mood_score = int(request.form['mood_score'])
            mood_label = request.form['mood_label']
            notes = request.form.get('notes', '')
            sleep_hours = float(request.form.get('sleep_hours', 0)) if request.form.get('sleep_hours') else None
            activity_level = int(request.form.get('activity_level', 0)) if request.form.get('activity_level') else None
            stress_level = int(request.form.get('stress_level', 0)) if request.form.get('stress_level') else None
            
            good_thing = request.form.get('good_thing', '')
            bad_thing = request.form.get('bad_thing', '')
            
            # Проверяем, нет ли записи за эту дату у этого пользователя
            existing_entry = MoodEntry.query.filter_by(user_id=current_user.id, date=date).first()
            if existing_entry:
                flash('Запись за эту дату уже существует!', 'error')
                return redirect(url_for('add_entry'))
            
            entry = MoodEntry(
                date=date,
                mood_score=mood_score,
                mood_label=mood_label,
                notes=notes,
                sleep_hours=sleep_hours,
                activity_level=activity_level,
                stress_level=stress_level,
                good_thing=good_thing,
                bad_thing=bad_thing,
                user_id=current_user.id
            )
            
            db.session.add(entry)
            db.session.commit()
            flash('Запись успешно добавлена!', 'success')
            return redirect(url_for('index'))
            
        except Exception as e:
            flash(f'Ошибка: {str(e)}', 'error')
    
    today = datetime.now().date()
    return render_template('add_entry.html', today=today)

@app.route('/api/mood_data')
@login_required
def mood_data():
    try:
        entries = MoodEntry.query.filter_by(user_id=current_user.id).order_by(MoodEntry.date).all()
        
        data = {
            'dates': [entry.date.strftime('%Y-%m-%d') for entry in entries],
            'mood_scores': [entry.mood_score for entry in entries],
            'sleep_hours': [entry.sleep_hours if entry.sleep_hours else 0 for entry in entries],
            'activity_levels': [entry.activity_level if entry.activity_level else 0 for entry in entries],
            'stress_levels': [entry.stress_level if entry.stress_level else 0 for entry in entries]
        }
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/entry/<int:entry_id>')
@login_required
def view_entry(entry_id):
    entry = MoodEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    return render_template('view_entry.html', entry=entry)

@app.route('/entry/<int:entry_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_entry(entry_id):
    entry = MoodEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    
    if request.method == 'POST':
        try:
            entry.mood_score = int(request.form['mood_score'])
            entry.mood_label = request.form['mood_label']
            entry.notes = request.form.get('notes', '')
            entry.sleep_hours = float(request.form.get('sleep_hours', 0)) if request.form.get('sleep_hours') else None
            entry.activity_level = int(request.form.get('activity_level', 0)) if request.form.get('activity_level') else None
            entry.stress_level = int(request.form.get('stress_level', 0)) if request.form.get('stress_level') else None
            
            entry.good_thing = request.form.get('good_thing', '')
            entry.bad_thing = request.form.get('bad_thing', '')
            
            db.session.commit()
            flash('Запись обновлена!', 'success')
            return redirect(url_for('view_entry', entry_id=entry.id))
            
        except Exception as e:
            flash(f'Ошибка: {str(e)}', 'error')
    
    return render_template('edit_entry.html', entry=entry)

@app.route('/entry/<int:entry_id>/delete', methods=['POST'])
@login_required
def delete_entry(entry_id):
    entry = MoodEntry.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
    db.session.delete(entry)
    db.session.commit()
    flash('Запись удалена', 'success')
    return redirect(url_for('index'))

# ============= ЗАПУСК =============
if __name__ == '__main__':
    print("="*50)
    print("ЗАПУСК FLASK СЕРВЕРА")
    print("="*50)
    print("Доступные маршруты:")
    print("  - /login")
    print("  - /register")
    print("  - /logout")
    print("  - /")
    print("  - /stats")
    print("  - /add")
    print("  - /api/mood_data")
    print("="*50)
    app.run(debug=True, host='127.0.0.1', port=5000)