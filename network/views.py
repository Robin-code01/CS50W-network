from binascii import Error
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.http import JsonResponse
import json
from django.shortcuts import render
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.paginator import Paginator

from .models import User, Post


@ensure_csrf_cookie
def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("network:index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("network:index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("network:index"))
    else:
        return render(request, "network/register.html")

def user(request):
    isAuth = request.user.is_authenticated
    username = request.user.username

    return JsonResponse({
        "is_authenticated": isAuth,
        "username": username,
    })


@login_required
def new_post(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)
        content = data.get("content", "")
        if content:
            Post.objects.create(user=request.user, content=content)
            return JsonResponse({"message": "Post created successfully."}, status=201)
        else:
            return JsonResponse({"error": "Content cannot be empty."}, status=400)

    return JsonResponse({"error": "Invalid request method."}, status=405)


def posts(request):
    if request.method == "GET":
        posts = Post.objects.all().order_by("-timestamp")
        
        posts_data = []
        
        for post in posts:
            posts_data.append(
                {
                    "id": post.id,
                    "user": post.user.username,
                    "content": post.content,
                    "timestamp": post.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
        return JsonResponse(posts_data, safe=False)

    return JsonResponse({"error": "Invalid request method."}, status=405)

def pagination(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            current_page = int(data.get("currentPage"))
            posts_per_page = int(data.get("postsPerPage"))
        except Error as e:
            return JsonResponse({"error": e, "cp": current_page}, status=400)

        posts = Post.objects.all().order_by("-timestamp")
        paginate = Paginator(posts, posts_per_page)
        total_pages = paginate.num_pages
        total_posts = posts.count()

        if current_page < 1 or current_page > total_pages:
            return JsonResponse({"error": "Page out of range."}, status=400)
        
        page = paginate.get_page(current_page)

        return JsonResponse({
            "current_posts": list(page.object_list.values(
                "id", "user__username", "content", "timestamp"
            )),
          #  "currentPage": current_page,
            "total_pages": int(total_pages),
            "has_next_page": bool(page.has_next()),
            "has_previous_page": bool(page.has_previous()),
        }, status=200)

    return JsonResponse({"error": "Invalid request method."}, status=405)
