import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.config import get_settings

settings = get_settings()


class PlatformAPIService:
    """Service for interacting with social media platform APIs"""
    
    def __init__(self):
        self.api_keys = {
            "tiktok": settings.TIKTOK_API_KEY,
            "instagram": settings.INSTAGRAM_API_KEY,
            "youtube": settings.YOUTUBE_API_KEY,
            "facebook": settings.FACEBOOK_API_KEY
        }
    
    async def _make_request(
        self,
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        data: Dict[str, Any] = None,
        params: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to platform API"""
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    # TikTok API methods
    async def tiktok_publish_video(
        self,
        access_token: str,
        video_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """Publish a video to TikTok"""
        if not self.api_keys["tiktok"]:
            raise ValueError("TIKTOK_API_KEY not configured")
        
        # TikTok Content Posting API endpoint
        url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        data = {
            "post_info": {
                "title": caption,
                "privacy_level": "PUBLIC_TO_EVERYONE"
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": video_url
            }
        }
        return await self._make_request("POST", url, headers=headers, data=data)
    
    async def tiktok_get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get TikTok user information"""
        url = "https://open.tiktokapis.com/v2/user/info/"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"fields": "open_id,union_id,avatar_url,display_name,follower_count"}
        return await self._make_request("GET", url, headers=headers, params=params)
    
    async def tiktok_get_videos(self, access_token: str) -> Dict[str, Any]:
        """Get user's TikTok videos"""
        url = "https://open.tiktokapis.com/v2/video/list/"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"fields": "id,title,like_count,comment_count,share_count,view_count"}
        return await self._make_request("POST", url, headers=headers, params=params)
    
    # Instagram API methods (via Facebook Graph API)
    async def instagram_publish_post(
        self,
        access_token: str,
        instagram_account_id: str,
        image_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """Publish a post to Instagram"""
        if not self.api_keys["instagram"]:
            raise ValueError("INSTAGRAM_API_KEY not configured")
        
        # Create media container
        container_url = f"https://graph.facebook.com/v18.0/{instagram_account_id}/media"
        container_data = {
            "image_url": image_url,
            "caption": caption,
            "access_token": access_token
        }
        container_response = await self._make_request("POST", container_url, data=container_data)
        
        # Publish the container
        publish_url = f"https://graph.facebook.com/v18.0/{instagram_account_id}/media_publish"
        publish_data = {
            "creation_id": container_response["id"],
            "access_token": access_token
        }
        return await self._make_request("POST", publish_url, data=publish_data)
    
    async def instagram_get_insights(
        self,
        access_token: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Get Instagram account insights"""
        url = f"https://graph.facebook.com/v18.0/{instagram_account_id}/insights"
        params = {
            "metric": "impressions,reach,follower_count,profile_views",
            "period": "day",
            "access_token": access_token
        }
        return await self._make_request("GET", url, params=params)
    
    async def instagram_get_messages(
        self,
        access_token: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Get Instagram direct messages"""
        url = f"https://graph.facebook.com/v18.0/{instagram_account_id}/conversations"
        params = {
            "platform": "instagram",
            "access_token": access_token
        }
        return await self._make_request("GET", url, params=params)
    
    # YouTube API methods
    async def youtube_upload_video(
        self,
        access_token: str,
        video_path: str,
        title: str,
        description: str,
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """Upload a video to YouTube"""
        if not self.api_keys["youtube"]:
            raise ValueError("YOUTUBE_API_KEY not configured")
        
        # YouTube requires a multipart upload - simplified version
        url = "https://www.googleapis.com/upload/youtube/v3/videos"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "part": "snippet,status",
            "key": self.api_keys["youtube"]
        }
        data = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags or []
            },
            "status": {
                "privacyStatus": "public"
            }
        }
        return await self._make_request("POST", url, headers=headers, params=params, data=data)
    
    async def youtube_get_channel_stats(self, access_token: str) -> Dict[str, Any]:
        """Get YouTube channel statistics"""
        url = "https://www.googleapis.com/youtube/v3/channels"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "part": "statistics,snippet",
            "mine": "true",
            "key": self.api_keys["youtube"]
        }
        return await self._make_request("GET", url, headers=headers, params=params)
    
    async def youtube_get_video_analytics(
        self,
        access_token: str,
        video_id: str
    ) -> Dict[str, Any]:
        """Get YouTube video analytics"""
        url = "https://www.googleapis.com/youtube/v3/videos"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "part": "statistics",
            "id": video_id,
            "key": self.api_keys["youtube"]
        }
        return await self._make_request("GET", url, headers=headers, params=params)
    
    async def youtube_get_comments(
        self,
        access_token: str,
        video_id: str
    ) -> Dict[str, Any]:
        """Get YouTube video comments"""
        url = "https://www.googleapis.com/youtube/v3/commentThreads"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "part": "snippet",
            "videoId": video_id,
            "key": self.api_keys["youtube"]
        }
        return await self._make_request("GET", url, headers=headers, params=params)
    
    # Facebook API methods
    async def facebook_publish_post(
        self,
        access_token: str,
        page_id: str,
        message: str,
        link: str = None,
        photo_url: str = None
    ) -> Dict[str, Any]:
        """Publish a post to Facebook page"""
        if not self.api_keys["facebook"]:
            raise ValueError("FACEBOOK_API_KEY not configured")
        
        url = f"https://graph.facebook.com/v18.0/{page_id}/feed"
        data = {
            "message": message,
            "access_token": access_token
        }
        if link:
            data["link"] = link
        if photo_url:
            url = f"https://graph.facebook.com/v18.0/{page_id}/photos"
            data["url"] = photo_url
        
        return await self._make_request("POST", url, data=data)
    
    async def facebook_get_page_insights(
        self,
        access_token: str,
        page_id: str
    ) -> Dict[str, Any]:
        """Get Facebook page insights"""
        url = f"https://graph.facebook.com/v18.0/{page_id}/insights"
        params = {
            "metric": "page_impressions,page_engaged_users,page_fans,page_views_total",
            "period": "day",
            "access_token": access_token
        }
        return await self._make_request("GET", url, params=params)
    
    async def facebook_get_page_messages(
        self,
        access_token: str,
        page_id: str
    ) -> Dict[str, Any]:
        """Get Facebook page messages"""
        url = f"https://graph.facebook.com/v18.0/{page_id}/conversations"
        params = {
            "access_token": access_token
        }
        return await self._make_request("GET", url, params=params)
    
    async def facebook_reply_to_comment(
        self,
        access_token: str,
        comment_id: str,
        message: str
    ) -> Dict[str, Any]:
        """Reply to a Facebook comment"""
        url = f"https://graph.facebook.com/v18.0/{comment_id}/comments"
        data = {
            "message": message,
            "access_token": access_token
        }
        return await self._make_request("POST", url, data=data)
    
    # Generic methods
    async def search_platform(
        self,
        platform: str,
        access_token: str,
        query: str
    ) -> Dict[str, Any]:
        """Search for content on a platform"""
        if platform == "youtube":
            url = "https://www.googleapis.com/youtube/v3/search"
            headers = {"Authorization": f"Bearer {access_token}"}
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "key": self.api_keys["youtube"]
            }
            return await self._make_request("GET", url, headers=headers, params=params)
        
        elif platform == "facebook":
            url = "https://graph.facebook.com/v18.0/search"
            params = {
                "q": query,
                "type": "post",
                "access_token": access_token
            }
            return await self._make_request("GET", url, params=params)
        
        # Add more platform searches as needed
        return {"results": []}


platform_api_service = PlatformAPIService()
